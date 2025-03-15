import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'

const origin = process.argv[2] || 'https://mcp-ql3.vercel.app'

async function main() {
  const transport = new SSEClientTransport(new URL(`${origin}/sse`))
  const client = new Client(
    { name: 'example-client', version: '1.0.0' },
    { capabilities: { prompts: {}, resources: {}, tools: {} } },
  )

  await client.connect(transport)
  console.log('Connected', client.getServerCapabilities())

  const tools = await client.listTools()
  console.log('Available tools:', tools)

  // Test the create_repository tool
  const createRepoResult = await client.callTool('create_repository', {
    name: 'test-repo-' + Date.now(),
    description: 'A test repository created via MCP',
    private: false,
  })
  console.log('Create repository result:', createRepoResult)

  await transport.close()
}

main().catch(console.error)
