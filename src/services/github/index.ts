import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { githubFetch, githubSchemas } from '@/services/github/tools'

export const registerGitHubTools = (server: McpServer) => {
  const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN as string

  server.tool('create_repository', githubSchemas.createRepository, async (params) => {
    const data = await githubFetch(token, '/user/repos', {
      method: 'POST',
      body: JSON.stringify(params),
    })
    return {
      content: [
        {
          type: 'text',
          text: `Repository created: ${data.html_url}`,
        },
      ],
    }
  })

  server.tool('get_repository', githubSchemas.getRepository, async ({ owner, repo }) => {
    const data = await githubFetch(token, `/repos/${owner}/${repo}`)
    return {
      content: [
        {
          type: 'text',
          text: `Repository: ${data.html_url}\nDescription: ${data.description}`,
        },
      ],
    }
  })

  server.tool(
    'get_file_contents',
    githubSchemas.getFileContents,
    async ({ owner, repo, path, ref }) => {
      const data = await githubFetch(
        token,
        `/repos/${owner}/${repo}/contents/${path}${ref ? `?ref=${ref}` : ''}`
      )
      const content = Buffer.from(data.content, 'base64').toString('utf8')
      return { content: [{ type: 'text', text: content }] }
    }
  )

  server.tool('create_or_update_file', githubSchemas.createOrUpdateFile, async (params) => {
    const { owner, repo, path, content, message, branch } = params
    let sha: string | undefined
    try {
      const existing = await githubFetch(
        token,
        `/repos/${owner}/${repo}/contents/${path}${branch ? `?ref=${branch}` : ''}`
      )
      sha = existing.sha
    } catch (e) {
      // File doesn’t exist
    }
    const data = await githubFetch(token, `/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: Buffer.from(content).toString('base64'),
        branch,
        sha,
      }),
    })
    return {
      content: [
        {
          type: 'text',
          text: `File ${sha ? 'updated' : 'created'}: ${data.content.html_url}`,
        },
      ],
    }
  })

  server.tool('create_issue', githubSchemas.createIssue, async ({ owner, repo, title, body }) => {
    const data = await githubFetch(token, `/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      body: JSON.stringify({ title, body }),
    })
    return {
      content: [
        {
          type: 'text',
          text: `Issue created: ${data.html_url}`,
        },
      ],
    }
  })

  server.tool('create_pull_request', githubSchemas.createPullRequest, async (params) => {
    const { owner, repo, title, head, base, body } = params
    const data = await githubFetch(token, `/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      body: JSON.stringify({ title, head, base, body }),
    })
    return {
      content: [
        {
          type: 'text',
          text: `Pull request created: ${data.html_url}`,
        },
      ],
    }
  })

  server.tool('list_commits', githubSchemas.listCommits, async ({ owner, repo, branch }) => {
    const data = await githubFetch(
      token,
      `/repos/${owner}/${repo}/commits${branch ? `?sha=${branch}` : ''}`
    )
    const commits = data.map((commit: any) => `${commit.sha}: ${commit.commit.message}`).join('\n')
    return { content: [{ type: 'text', text: `Commits:\n${commits}` }] }
  })

  server.tool('search_repositories', githubSchemas.searchRepositories, async ({ query }) => {
    const data = await githubFetch(token, `/search/repositories?q=${encodeURIComponent(query)}`)
    const repos = data.items.map((repo: any) => `${repo.full_name}: ${repo.html_url}`).join('\n')
    return {
      content: [
        {
          type: 'text',
          text: `Found repositories:\n${repos}`,
        },
      ],
    }
  })

  server.tool('fork_repository', githubSchemas.forkRepository, async ({ owner, repo }) => {
    const data = await githubFetch(token, `/repos/${owner}/${repo}/forks`, { method: 'POST' })
    return {
      content: [
        {
          type: 'text',
          text: `Fork created: ${data.html_url}`,
        },
      ],
    }
  })
}

export const githubCapabilities = {
  create_repository: { description: 'Create a GitHub repository' },
  get_repository: { description: 'Get details of a GitHub repository' },
  get_file_contents: { description: 'Get the contents of a file in a repository' },
  create_or_update_file: { description: 'Create or update a file in a repository' },
  create_issue: { description: 'Create an issue in a repository' },
  create_pull_request: { description: 'Create a pull request in a repository' },
  list_commits: { description: 'List commits in a repository' },
  search_repositories: { description: 'Search for GitHub repositories' },
  fork_repository: { description: 'Fork a GitHub repository' },
}
