#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'

const [, , command, url, ...args] = process.argv

async function runCli() {
  if (!url) {
    console.error('Usage: mcp-cli <command> <url> [args]')
    console.error('Commands: list-tools, echo <message>')
    process.exit(1)
  }

  const transport = new SSEClientTransport(new URL(`${url}/sse`))
  const client = new Client(
    { name: 'mcp-cli', version: '1.0.0' },
    { capabilities: { prompts: {}, resources: {}, tools: {} } },
  )

  await client.connect(transport)

  switch (command) {
    case 'list-tools':
      const tools = await client.listTools()
      console.log('Available tools:', JSON.stringify(tools, null, 2))
      break
    case 'echo':
      const message = args.join(' ') || 'Hello from CLI'
      const result = await client.invokeTool('echo', { message })
      console.log('Echo result:', JSON.stringify(result, null, 2))
      break
    default:
      console.error('Unknown command:', command)
      console.error('Available commands: list-tools, echo')
  }

  await client.disconnect()
}

runCli().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
