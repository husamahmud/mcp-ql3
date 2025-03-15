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

  // console.log('Client methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(client)))
  await transport.close()
}

main().catch(console.error)
