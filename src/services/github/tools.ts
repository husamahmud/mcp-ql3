import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { GitHubService } from './index'
import {
  GitHubCommitResponse,
  GitHubFileContentResponse,
  GitHubIssueResponse,
  GitHubPullRequestResponse,
  GitHubRepositoryResponse,
  GitHubSearchResponse,
} from './types'

/**
 * Register all GitHub tools with the MCP server
 * @param server - MCP server instance
 * @param githubService - GitHub service instance (optional)
 */
export function registerGitHubTools(server: McpServer, githubService: GitHubService = new GitHubService()): void {
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
      const data = await githubService.request<GitHubRepositoryResponse>('/user/repos', {
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
      const data = await githubService.request<GitHubRepositoryResponse>(`/repos/${owner}/${repo}`)

      return {
        content: [{
          type: 'text',
          text: `Repository: ${data.html_url}\nDescription: ${data.description || 'No description'}`,
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
      const queryParams = ref ? `?ref=${ref}` : ''
      const data = await githubService.request<GitHubFileContentResponse>(
        `/repos/${owner}/${repo}/contents/${path}${queryParams}`,
      )

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
        const queryParams = branch ? `?ref=${branch}` : ''
        const existing = await githubService.request<GitHubFileContentResponse>(
          `/repos/${owner}/${repo}/contents/${path}${queryParams}`,
        )
        sha = existing.sha
      } catch (e) {
        // File doesn't exist, proceed with create
      }

      const response = await githubService.request<{
        content: { html_url: string }
      }>(
        `/repos/${owner}/${repo}/contents/${path}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            message,
            content: Buffer.from(content).toString('base64'),
            branch,
            sha,
          }),
        },
      )

      return {
        content: [{
          type: 'text',
          text: `File ${sha ? 'updated' : 'created'}: ${response.content.html_url}`,
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
      const data = await githubService.request<GitHubIssueResponse>(`/repos/${owner}/${repo}/issues`, {
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
      const data = await githubService.request<GitHubPullRequestResponse>(`/repos/${owner}/${repo}/pulls`, {
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
      const queryParams = branch ? `?sha=${branch}` : ''
      const data = await githubService.request<GitHubCommitResponse[]>(
        `/repos/${owner}/${repo}/commits${queryParams}`,
      )

      const commits = data.map((commit) => `${commit.sha.substring(0, 7)}: ${commit.commit.message}`).join('\n')
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
      const data = await githubService.request<GitHubSearchResponse>(
        `/search/repositories?q=${encodeURIComponent(query)}`,
      )

      const repos = data.items.map((repo) => `${repo.full_name}: ${repo.html_url}`).join('\n')
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
      const data = await githubService.request<GitHubRepositoryResponse>(`/repos/${owner}/${repo}/forks`, {
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
}
