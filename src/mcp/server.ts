import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ServerOptions } from '@modelcontextprotocol/sdk/server/index.js'

import { registerGitHubTools } from '@/services/github/tools'
import { logger } from '@/utils/logging'

/**
 * Default server capabilities
 */
const defaultCapabilities: ServerOptions = {
  capabilities: {
    tools: {
      echo: { description: 'Echo a message' },
      create_repository: { description: 'Create a GitHub repository' },
      get_repository: { description: 'Get details of a GitHub repository' },
      get_file_contents: { description: 'Get the contents of a file in a repository' },
      create_or_update_file: { description: 'Create or update a file in a repository' },
      create_issue: { description: 'Create an issue in a repository' },
      create_pull_request: { description: 'Create a pull request in a repository' },
      list_commits: { description: 'List commits in a repository' },
      search_repositories: { description: 'Search for GitHub repositories' },
      fork_repository: { description: 'Fork a GitHub repository' },
    },
  },
}

/**
 * Create and configure a new MCP server instance
 * @param customOptions - Custom server options to merge with defaults
 * @returns Configured MCP server instance
 */
export function createMcpServer(customOptions?: ServerOptions): McpServer {
  const options = {
    ...defaultCapabilities,
    ...customOptions,
  }

  const server = new McpServer(
    {
      name: 'mcp-ql3 server',
      version: '1.0.0',
    },
    options,
  )

  // Register GitHub tools
  registerGitHubTools(server)

  // Set up server close handler
  server.server.onclose = () => {
    logger.info('MCP server connection closed')
  }

  return server
}
