import { z } from 'zod'
import { initializeMcpApiHandler } from '../lib/mcp-api-handler'

const handler = initializeMcpApiHandler(
  (server) => {
    const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN as string
    if (!token) {
      throw new Error('GITHUB_PERSONAL_ACCESS_TOKEN is not set')
    }

    // Helper function for GitHub API requests
    const githubFetch = async (url: string, options: RequestInit = {}) => {
      const response = await fetch(`https://api.github.com${url}`, {
        ...options,
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`${options.method || 'GET'} ${url} failed: ${response.statusText} - ${errorText}`)
      }
      return response.json()
    }

    // 1. Create a repository
    server.tool(
      'create_repository',
      {
        name: z.string().describe('The name of the repository'),
        description: z.string().optional().describe('The description of the repository'),
        private: z.boolean().optional().default(false).describe('Whether the repository is private'),
        auto_init: z.boolean().optional().default(false).describe('Initialize with a README'),
      },
      async ({ name, description, private: isPrivate, auto_init }) => {
        const data = await githubFetch('/user/repos', {
          method: 'POST',
          body: JSON.stringify({
            name,
            description,
            private: isPrivate,
            auto_init,
          }),
        })
        return {
          content: [{
            type: 'text',
            text: `Repository created: ${data.html_url}`,
          }],
        }
      },
    )

    // 2. Get repository details
    server.tool(
      'get_repository',
      {
        owner: z.string().describe('The repository owner'),
        repo: z.string().describe('The repository name'),
      },
      async ({ owner, repo }) => {
        const data = await githubFetch(`/repos/${owner}/${repo}`)
        return {
          content: [{
            type: 'text',
            text: `Repository: ${data.html_url}\nDescription: ${data.description}`,
          }],
        }
      },
    )

    // 3. Get file contents
    server.tool(
      'get_file_contents',
      {
        owner: z.string().describe('The repository owner'),
        repo: z.string().describe('The repository name'),
        path: z.string().describe('The file path in the repository'),
        ref: z.string().optional().describe('The branch, tag, or commit SHA (optional)'),
      },
      async ({ owner, repo, path, ref }) => {
        const data = await githubFetch(`/repos/${owner}/${repo}/contents/${path}${ref ? `?ref=${ref}` : ''}`)
        const content = Buffer.from(data.content, 'base64').toString('utf8')
        return { content: [{ type: 'text', text: content }] }
      },
    )

    // 4. Create or update a file
    server.tool(
      'create_or_update_file',
      {
        owner: z.string().describe('The repository owner'),
        repo: z.string().describe('The repository name'),
        path: z.string().describe('The file path in the repository'),
        content: z.string().describe('The file content (will be base64 encoded)'),
        message: z.string().describe('The commit message'),
        branch: z.string().optional().default('main').describe('The branch to commit to'),
      },
      async ({ owner, repo, path, content, message, branch }) => {
        // Check if file exists to get SHA for update
        let sha: string | undefined
        try {
          const existing = await githubFetch(`/repos/${owner}/${repo}/contents/${path}${branch ? `?ref=${branch}` : ''}`)
          sha = existing.sha
        } catch (e) {
          // File doesn’t exist, proceed with create
        }

        const data = await githubFetch(`/repos/${owner}/${repo}/contents/${path}`, {
          method: 'PUT',
          body: JSON.stringify({
            message,
            content: Buffer.from(content).toString('base64'),
            branch,
            sha,
          }),
        })
        return {
          content: [{
            type: 'text',
            text: `File ${sha ? 'updated' : 'created'}: ${data.content.html_url}`,
          }],
        }
      },
    )

    // 5. Create an issue
    server.tool(
      'create_issue',
      {
        owner: z.string().describe('The repository owner'),
        repo: z.string().describe('The repository name'),
        title: z.string().describe('The issue title'),
        body: z.string().optional().describe('The issue body'),
      },
      async ({ owner, repo, title, body }) => {
        const data = await githubFetch(`/repos/${owner}/${repo}/issues`, {
          method: 'POST',
          body: JSON.stringify({ title, body }),
        })
        return {
          content: [{
            type: 'text',
            text: `Issue created: ${data.html_url}`,
          }],
        }
      },
    )

    // 6. Create a pull request
    server.tool(
      'create_pull_request',
      {
        owner: z.string().describe('The repository owner'),
        repo: z.string().describe('The repository name'),
        title: z.string().describe('The pull request title'),
        head: z.string().describe('The branch with changes (e.g., "feature-branch")'),
        base: z.string().describe('The branch to merge into (e.g., "main")'),
        body: z.string().optional().describe('The pull request body'),
      },
      async ({ owner, repo, title, head, base, body }) => {
        const data = await githubFetch(`/repos/${owner}/${repo}/pulls`, {
          method: 'POST',
          body: JSON.stringify({ title, head, base, body }),
        })
        return {
          content: [{
            type: 'text',
            text: `Pull request created: ${data.html_url}`,
          }],
        }
      },
    )

    // 7. List repository commits
    server.tool(
      'list_commits',
      {
        owner: z.string().describe('The repository owner'),
        repo: z.string().describe('The repository name'),
        branch: z.string().optional().default('main').describe('The branch to list commits from'),
      },
      async ({ owner, repo, branch }) => {
        const data = await githubFetch(`/repos/${owner}/${repo}/commits${branch ? `?sha=${branch}` : ''}`)
        const commits = data.map((commit: any) => `${commit.sha}: ${commit.commit.message}`).join('\n')
        return { content: [{ type: 'text', text: `Commits:\n${commits}` }] }
      },
    )

    // 8. Search repositories
    server.tool(
      'search_repositories',
      {
        query: z.string().describe('The search query (e.g., "language:javascript stars:>1000")'),
      },
      async ({ query }) => {
        const data = await githubFetch(`/search/repositories?q=${encodeURIComponent(query)}`)
        const repos = data.items.map((repo: any) => `${repo.full_name}: ${repo.html_url}`).join('\n')
        return {
          content: [{
            type: 'text',
            text: `Found repositories:\n${repos}`,
          }],
        }
      },
    )

    // 9. Fork a repository
    server.tool(
      'fork_repository',
      {
        owner: z.string().describe('The owner of the repository to fork'),
        repo: z.string().describe('The name of the repository to fork'),
      },
      async ({ owner, repo }) => {
        const data = await githubFetch(`/repos/${owner}/${repo}/forks`, {
          method: 'POST',
        })
        return {
          content: [{
            type: 'text',
            text: `Fork created: ${data.html_url}`,
          }],
        }
      },
    )
  },
  {
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
  },
)

export default handler
