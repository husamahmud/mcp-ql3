import { IncomingMessage, ServerResponse } from 'http'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ServerOptions } from '@modelcontextprotocol/sdk/server/index.js'
import { config } from '@/config/environment'
import { logger } from '@/utils/logging'
import { handleMessageRequest, handleSseConnection } from '@/mcp/transport'
import { createMcpServer } from '@/mcp/server'

/**
 * Type definition for the MCP API handler function
 */
type McpApiHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

/**
 * Initialize the MCP API handler
 * @param initializeServer - Function to initialize the MCP server (optional)
 * @param serverOptions - Server options (optional)
 * @returns API handler function
 */
export function initializeMcpApiHandler(
  initializeServer?: (server: McpServer) => void,
  serverOptions?: ServerOptions,
): McpApiHandler {
  // Validate environment configuration
  config.validate()

  // Track active server instances
  let activeServers: McpServer[] = []

  /**
   * Handler function for MCP API requests
   */
  return async function mcpApiHandler(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      // Parse URL
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)

      // Route request based on path
      if (url.pathname === '/sse') {
        await handleSseRequest(req, res)
      } else if (url.pathname === '/message') {
        await handleMessageRequest(req, res)
      } else {
        res.statusCode = 404
        res.end('Not found')
      }
    } catch (error) {
      logger.error('Error handling request:', error)
      res.statusCode = 500
      res.end('Internal server error')
    }
  }

  /**
   * Handle SSE connection requests
   */
  async function handleSseRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      // Set up the SSE connection
      const {
        transport,
        cleanup,
      } = await handleSseConnection(req, res, config.server.maxDuration)

      // Create and configure the server
      const server = createMcpServer(serverOptions)

      // Allow custom initialization if provided
      if (initializeServer) {
        initializeServer(server)
      }

      // Track the server instance
      activeServers.push(server)

      // Remove the server when connection closes
      server.server.onclose = () => {
        activeServers = activeServers.filter(s => s !== server)
        logger.info('Server connection closed')
      }

      // Connect the server to the transport
      await server.connect(transport)

      // Set up cleanup on request close
      req.on('close', cleanup)

      // Handle transport close
      transport.onclose = cleanup
    } catch (error) {
      logger.error('Error handling SSE request:', error)
      res.statusCode = 500
      res.end('Internal server error')
    }
  }
}
