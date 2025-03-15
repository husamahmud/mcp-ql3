declare module '@modelcontextprotocol/server-github' {
  import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

  export function registerGithubTools(
    server: McpServer,
    config: { personalAccessToken: string },
  ): void;
}
