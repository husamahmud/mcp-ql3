import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'

const ORIGIN = 'https://mcp-ql3.vercel.app'
const OWNER = 'husamahmud'
const REPO = 'mcp-ql3'

async function main() {
  const transport = new SSEClientTransport(new URL(`${ORIGIN}/sse`))
  const client = new Client(
    { name: 'example-client', version: '1.0.0' },
    { capabilities: { prompts: {}, resources: {}, tools: {} } },
  )

  await client.connect(transport)
  console.log('Connected', client.getServerCapabilities())
  console.log('Available tools:', await client.listTools())

  // Test create_repository
  const repoResult = await client.invokeTool('create_repository', {
    name: 'test-repo-' + Date.now(),
    description: 'A test repo',
    private: false,
    auto_init: true,
  })
  console.log('Create repo result:', repoResult)

  // Test get_file_contents
  const fileResult = await client.invokeTool('get_file_contents', {
    owner: OWNER,
    repo: REPO,
    path: 'README.md',
  })
  console.log('File contents:', fileResult)

  // Test create_issue
  const issueResult = await client.invokeTool('create_issue', {
    owner: OWNER,
    repo: REPO,
    title: 'Test Issue',
    body: 'This is a test issue',
  })
  console.log('Create issue result:', issueResult)

  await transport.close()
}

main().catch(console.error)
