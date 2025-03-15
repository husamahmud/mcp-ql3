import { initializeMcpApiHandler } from '@/mcp/api-handler'

/**
 * API handler for Vercel deployment
 *
 * This serves as the entry point for the Vercel serverless function.
 * It initializes the MCP API handler with appropriate configuration.
 */
const handler = initializeMcpApiHandler()

export default handler
