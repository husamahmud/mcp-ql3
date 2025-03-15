import getRawBody from 'raw-body'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'http'
import { createClient, RedisClientType } from 'redis'
import { Socket } from 'net'
import { ServerOptions } from '@modelcontextprotocol/sdk/server/index.js'
import vercelJson from '../vercel.json'
import { Readable } from 'node:stream'

interface SerializedRequest {
  requestId: string;
  url: string;
  method: string;
  body: string;
  headers: IncomingHttpHeaders;
}

interface SerializedResponse {
  status: number;
  body: string;
}

interface LogEntry {
  type: 'log' | 'error';
  messages: string[];
}

interface FakeIncomingMessageOptions {
  method?: string;
  url?: string;
  headers?: IncomingHttpHeaders;
  body?: string | Buffer | Record<string, any> | null;
  socket?: Socket;
}

/**
 * Initialize the MCP API handler with appropriate server configuration
 * @param initializeServer Function to initialize the MCP server
 * @param serverOptions Optional server configuration options
 * @returns API handler function to process incoming requests
 */
export function initializeMcpApiHandler(
  initializeServer: (server: McpServer) => void,
  serverOptions: ServerOptions = {},
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  const maxDuration: number = vercelJson?.functions?.['api/server.ts']?.maxDuration || 800
  const redisUrl: string = process.env.REDIS_URL || process.env.KV_URL || ''

  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is not set')
  }

  const redis: RedisClientType = createClient({ url: redisUrl })
  const redisPublisher: RedisClientType = createClient({ url: redisUrl })

  redis.on('error', (err: Error) => {
    console.error('Redis error', err)
  })

  redisPublisher.on('error', (err: Error) => {
    console.error('Redis error', err)
  })

  const redisPromise: Promise<unknown> = Promise.all([
    redis.connect(),
    redisPublisher.connect(),
  ])

  let servers: McpServer[] = []

  /**
   * Handler function for MCP API requests
   */
  return async function mcpApiHandler(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    await redisPromise
    const url = new URL(req.url || '', 'https://example.com')

    if (url.pathname === '/sse') {
      await handleSseRequest(req, res)
    } else if (url.pathname === '/message') {
      await handleMessageRequest(req, res)
    } else {
      res.statusCode = 404
      res.end('Not found')
    }
  }

  /**
   * Handle SSE connection requests
   */
  async function handleSseRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    console.log('Got new SSE connection')

    const transport = new SSEServerTransport('/message', res)
    const sessionId = transport.sessionId
    const server = new McpServer(
      {
        name: 'mcp-typescript server on vercel',
        version: '0.1.0',
      },
      serverOptions,
    )

    initializeServer(server)
    servers.push(server)

    server.server.onclose = () => {
      console.log('SSE connection closed')
      servers = servers.filter((s) => s !== server)
    }

    let logs: LogEntry[] = []

    /**
     * Capture logs in the context of the right invocation
     */
    function logInContext(severity: 'log' | 'error', ...messages: string[]): void {
      logs.push({
        type: severity,
        messages,
      })
    }

    /**
     * Handle messages received via Redis
     */
    const handleMessage = async (message: string): Promise<void> => {
      console.log('Received message from Redis', message)
      logInContext('log', 'Received message from Redis', message)

      const request = JSON.parse(message) as SerializedRequest
      const req = createFakeIncomingMessage({
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: request.body,
      })

      const syntheticRes = new ServerResponse(req)
      let status = 100
      let body = ''

      syntheticRes.writeHead = (statusCode: number) => {
        status = statusCode
        return syntheticRes
      }

      syntheticRes.end = (b: unknown) => {
        body = b as string
        return syntheticRes
      }

      await transport.handlePostMessage(req, syntheticRes)

      await redisPublisher.publish(
        `responses:${sessionId}:${request.requestId}`,
        JSON.stringify({
          status,
          body,
        } as SerializedResponse),
      )

      if (status >= 200 && status < 300) {
        logInContext(
          'log',
          `Request ${sessionId}:${request.requestId} succeeded: ${body}`,
        )
      } else {
        logInContext(
          'error',
          `Message for ${sessionId}:${request.requestId} failed with status ${status}: ${body}`,
        )
      }
    }

    const interval = setInterval(() => {
      for (const log of logs) {
        console[log.type].call(console, ...log.messages)
      }
      logs = []
    }, 100)

    await redis.subscribe(`requests:${sessionId}`, handleMessage)
    console.log(`Subscribed to requests:${sessionId}`)

    let timeout: NodeJS.Timeout
    let resolveTimeout: (value: unknown) => void

    const waitPromise = new Promise((resolve) => {
      resolveTimeout = resolve
      timeout = setTimeout(() => {
        resolve('max duration reached')
      }, (maxDuration - 5) * 1000)
    })

    /**
     * Clean up resources when connection closes
     */
    async function cleanup(): Promise<void> {
      clearTimeout(timeout)
      clearInterval(interval)
      await redis.unsubscribe(`requests:${sessionId}`, handleMessage)
      console.log('Done')
      res.statusCode = 200
      res.end()
    }

    req.on('close', () => resolveTimeout('client hang up'))

    await server.connect(transport)
    const closeReason = await waitPromise
    console.log(closeReason)
    await cleanup()
  }

  /**
   * Handle message requests
   */
  async function handleMessageRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    console.log('Received message')

    const body = await getRawBody(req, {
      length: req.headers['content-length'],
      encoding: 'utf-8',
    })

    const sessionId = new URL(req.url || '', 'https://example.com').searchParams.get('sessionId') || ''
    if (!sessionId) {
      res.statusCode = 400
      res.end('No sessionId provided')
      return
    }

    const requestId = crypto.randomUUID()
    const serializedRequest: SerializedRequest = {
      requestId,
      url: req.url || '',
      method: req.method || '',
      body: body,
      headers: req.headers,
    }

    // Handle responses from the /sse endpoint
    await redis.subscribe(
      `responses:${sessionId}:${requestId}`,
      (message: string) => {
        clearTimeout(timeout)
        const response = JSON.parse(message) as SerializedResponse
        res.statusCode = response.status
        res.end(response.body)
      },
    )

    // Queue the request in Redis
    await redisPublisher.publish(
      `requests:${sessionId}`,
      JSON.stringify(serializedRequest),
    )
    console.log(`Published requests:${sessionId}`, serializedRequest)

    let timeout = setTimeout(async () => {
      await redis.unsubscribe(`responses:${sessionId}:${requestId}`)
      res.statusCode = 408
      res.end('Request timed out')
    }, 10 * 1000)

    res.on('close', async () => {
      clearTimeout(timeout)
      await redis.unsubscribe(`responses:${sessionId}:${requestId}`)
    })
  }
}


/**
 * Create a fake IncomingMessage for testing or simulation
 * Uses type assertion to properly handle event binding
 */
function createFakeIncomingMessage(
  options: FakeIncomingMessageOptions = {},
): IncomingMessage {
  const {
    method = 'GET',
    url = '/',
    headers = {},
    body = null,
    socket = new Socket(),
  } = options

  const readable = new Readable()

  // Create the IncomingMessage instance
  const req = new IncomingMessage(socket)

  // Set basic properties
  req.method = method
  req.url = url
  req.headers = headers

  // Add body content if provided
  if (body) {
    if (typeof body === 'string') {
      readable.push(body)
    } else if (Buffer.isBuffer(body)) {
      readable.push(body)
    } else {
      readable.push(JSON.stringify(body))
    }
    readable.push(null) // Signal the end of the stream
  }

  // Create a proxy for event handling that preserves correct types
  const originalOn = req.on.bind(req)
  const originalOnce = req.once.bind(req)

  // Override event methods to handle both IncomingMessage and Readable events
  req.on = function(event: string, listener: (...args: any[]) => void): IncomingMessage {
    if (['data', 'end', 'readable'].includes(event)) {
      readable.on(event, listener)
    }
    originalOn(event, listener)
    return req
  } as IncomingMessage['on']

  req.once = function(event: string, listener: (...args: any[]) => void): IncomingMessage {
    if (['data', 'end', 'readable'].includes(event)) {
      readable.once(event, listener)
    }
    originalOnce(event, listener)
    return req
  } as IncomingMessage['once']

  // Add necessary readable stream methods with proper typing
  req.read = (size?: number) => {
    return readable.read(size)
  }

  // Make it pipe-able while maintaining IncomingMessage type
  const originalPipe = req.pipe.bind(req)
  req.pipe = function <T extends NodeJS.WritableStream>(destination: T, options?: {
    end?: boolean
  }): T {
    readable.pipe(destination, options)
    return originalPipe(destination, options)
  }

  return req
}
