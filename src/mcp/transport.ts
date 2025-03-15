import { IncomingMessage, ServerResponse } from 'http'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { redisService } from '@/services/redis/client'
import { createFakeIncomingMessage } from '@/utils/http'
import { logger } from '@/utils/logging'
import getRawBody from 'raw-body'

/**
 * Interface for serialized HTTP requests
 */
export interface SerializedRequest {
  requestId: string;
  url: string;
  method: string;
  body: string;
  headers: IncomingMessage['headers'];
}

/**
 * Interface for serialized HTTP responses
 */
export interface SerializedResponse {
  status: number;
  body: string;
}

/**
 * Handles the SSE connection and message processing
 * @param req - HTTP request
 * @param res - HTTP response
 * @param maxDurationSeconds - Maximum duration in seconds for the connection
 */
export async function handleSseConnection(
  req: IncomingMessage,
  res: ServerResponse,
  maxDurationSeconds: number,
): Promise<{
  transport: SSEServerTransport;
  sessionId: string;
  cleanup: () => Promise<void>
}> {
  logger.info('Setting up new SSE connection')

  // Create the transport
  const transport = new SSEServerTransport('/message', res)
  const sessionId = transport.sessionId

  logger.info(`New SSE connection established with session ID: ${sessionId}`)

  /**
   * Handle incoming messages
   */
  const handleIncomingMessage = async (message: string): Promise<void> => {
    logger.info(`Received message from Redis for session ${sessionId}`)

    try {
      const request = JSON.parse(message) as SerializedRequest

      // Create a fake request to process
      const fakeReq = createFakeIncomingMessage({
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: request.body,
      })

      // Create a synthetic response object
      const syntheticRes = new ServerResponse(fakeReq)
      let status = 100
      let body = ''

      // Override writeHead to capture status code
      syntheticRes.writeHead = (statusCode: number) => {
        status = statusCode
        return syntheticRes
      }

      // Override end to capture response body
      syntheticRes.end = function(
        chunk?: any,
        encodingOrCb?: BufferEncoding | (() => void),
        cb?: () => void,
      ): ServerResponse<IncomingMessage> {
        // Handle different overload cases
        if (typeof encodingOrCb === 'function') {
          body = chunk?.toString() || ''
          encodingOrCb()
        } else if (typeof cb === 'function') {
          body = chunk?.toString() || ''
          cb()
        } else {
          body = chunk?.toString() || ''
        }
        return syntheticRes
      }

      // Process the message
      await transport.handlePostMessage(fakeReq, syntheticRes)

      // Publish the response back
      await redisService.publish(
        `responses:${sessionId}:${request.requestId}`,
        JSON.stringify({
          status,
          body,
        } as SerializedResponse),
      )

      if (status >= 200 && status < 300) {
        logger.info(`Request ${sessionId}:${request.requestId} succeeded`)
      } else {
        logger.error(`Message for ${sessionId}:${request.requestId} failed with status ${status}: ${body}`)
      }
    } catch (error) {
      logger.error('Error handling message:', error)
    }
  }

  // Set up timeout for maximum duration
  let timeoutId: NodeJS.Timeout
  const timeoutPromise = new Promise<string>((resolve) => {
    timeoutId = setTimeout(() => {
      resolve('max duration reached')
    }, (maxDurationSeconds - 5) * 1000) // 5 seconds less to allow for cleanup
  })

  // Set up client disconnect detection
  const disconnectPromise = new Promise<string>((resolve) => {
    req.on('close', () => resolve('client disconnected'))
  })

  // Subscribe to the Redis channel for this session
  await redisService.subscribe(`requests:${sessionId}`, handleIncomingMessage)

  // Start the logger
  logger.startBuffering()

  // Return the transport and cleanup function
  return {
    transport,
    sessionId,
    cleanup: async () => {
      clearTimeout(timeoutId)
      await redisService.unsubscribe(`requests:${sessionId}`, handleIncomingMessage)
      logger.stopBuffering()
      logger.info(`SSE connection ${sessionId} cleaned up`)
    },
  }
}

/**
 * Handles HTTP messages sent to the SSE connection
 * @param req - HTTP request
 * @param res - HTTP response
 */
export async function handleMessageRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  logger.info('Received message request')

  try {
    // Get the session ID from the URL
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)
    const sessionId = url.searchParams.get('sessionId')

    if (!sessionId) {
      res.statusCode = 400
      res.end('No sessionId provided')
      return
    }

    // Read the request body
    const body = await getRawBody(req, {
      length: req.headers['content-length'],
      encoding: 'utf-8',
    })

    // Generate a unique request ID
    const requestId = crypto.randomUUID()

    // Create the serialized request
    const serializedRequest: SerializedRequest = {
      requestId,
      url: req.url || '',
      method: req.method || '',
      body,
      headers: req.headers,
    }

    // Set up a timeout for the response
    const responseTimeout = setTimeout(() => {
      redisService.unsubscribe(`responses:${sessionId}:${requestId}`, handleResponse)
      res.statusCode = 408
      res.end('Request timed out')
    }, 10000) // 10 seconds timeout

    // Handle response messages
    const handleResponse = (message: string) => {
      clearTimeout(responseTimeout)

      try {
        const response = JSON.parse(message) as SerializedResponse
        res.statusCode = response.status
        res.end(response.body)
      } catch (error) {
        logger.error('Error handling response:', error)
        res.statusCode = 500
        res.end('Internal server error')
      }
    }

    // Subscribe to the response channel
    await redisService.subscribe(`responses:${sessionId}:${requestId}`, handleResponse)

    // Publish the request
    await redisService.publish(`requests:${sessionId}`, JSON.stringify(serializedRequest))
    logger.info(`Published request to channel: requests:${sessionId}`)

    // Clean up when the request is closed
    res.on('close', async () => {
      clearTimeout(responseTimeout)
      await redisService.unsubscribe(`responses:${sessionId}:${requestId}`, handleResponse)
    })
  } catch (error) {
    logger.error('Error handling message request:', error)
    res.statusCode = 500
    res.end('Internal server error')
  }
}
