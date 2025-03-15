import { initializeMcpApiHandler } from '../lib/mcp-api-handler'
import { githubCapabilities, registerGitHubTools } from '@/services/github'

const handler = initializeMcpApiHandler(
  (server) => {
    registerGitHubTools(server)
  },
  {
    capabilities: {
      tools: {
        ...githubCapabilities,
      },
    },
  }
)

export default handler
