import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'

const ORIGIN = 'https://mcp-ql3.vercel.app'

async function main() {
  // Connect to the server
  const transport = new SSEClientTransport(new URL(`${ORIGIN}/sse`))
  transport.onmessage = (message) => {
    console.log('Received message:', message)
  }

  const client = new Client(
    { name: 'prompt-test-client', version: '1.0.0' },
    { capabilities: { prompts: {}, resources: {}, tools: {} } }
  )

  await client.connect(transport)
  console.log('Connected', client.getServerCapabilities())
  console.log('Available tools:', await client.listTools())

  try {
    // Test the prompt tool
    console.log('Calling prompt tool...')
    const promptResult = await client.callTool('create_repository', {
      name: 'test-repo',
      description: 'A test repository',
      visibility: 'private',
    })
    console.log('Prompt result:', promptResult)
  } catch (error) {
    console.error('Error calling prompt tool:', error)
  }

  await transport.close()
}

main().catch(console.error)
