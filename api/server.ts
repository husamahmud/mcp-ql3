import { z } from 'zod'
import { initializeMcpApiHandler } from '../lib/mcp-api-handler'

const handler = initializeMcpApiHandler(
  (server) => {
    // Add more tools, resources, and prompts here
    server.tool('echo', { message: z.string() }, async ({ message }) => ({
      content: [{ type: 'text', text: `Tool echo: ${message}` }],
    }))
    server.tool(
      'create_repository',
      {
        name: z.string().describe('The name of the repository'),
        description: z.string().optional().describe('The description of the repository'),
        private: z.boolean().optional().default(false).describe('Whether the repository is private'),
      },
      async ({ name, description, private: isPrivate }) => {
        const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN
        if (!token) {
          throw new Error('GITHUB_PERSONAL_ACCESS_TOKEN is not set')
        }

        const response = await fetch('https://api.github.com/user/repos', {
          method: 'POST',
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github+json',
          },
          body: JSON.stringify({
            name,
            description,
            private: isPrivate,
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to create repository: ${response.statusText}`)
        }

        const data = await response.json()
        return {
          content: [{
            type: 'text',
            text: `Repository created: ${data.html_url}`,
          }],
        }
      },
    )
  },
  {
    capabilities: {
      tools: {
        echo: {
          description: 'Echo a message',
        },
        create_repository: {
          description: 'Create a GitHub repository',
        },
      },
    },
  },
)

export default handler
