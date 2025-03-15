import { z } from 'zod'

export async function githubFetch(
  token: string,
  url: string,
  options: RequestInit = {}
): Promise<any> {
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
    throw new Error(
      `${options.method || 'GET'} ${url} failed: ${response.statusText} - ${errorText}`
    )
  }
  return response.json()
}

export const githubSchemas = {
  createRepository: {
    name: z.string().describe('The name of the repository'),
    description: z.string().optional().describe('The description of the repository'),
    private: z.boolean().optional().default(false).describe('Whether the repository is private'),
    auto_init: z.boolean().optional().default(false).describe('Initialize with a README'),
  },
  getRepository: {
    owner: z.string().describe('The repository owner'),
    repo: z.string().describe('The repository name'),
  },
  getFileContents: {
    owner: z.string().describe('The repository owner'),
    repo: z.string().describe('The repository name'),
    path: z.string().describe('The file path in the repository'),
    ref: z.string().optional().describe('The branch, tag, or commit SHA (optional)'),
  },
  createOrUpdateFile: {
    owner: z.string().describe('The repository owner'),
    repo: z.string().describe('The repository name'),
    path: z.string().describe('The file path in the repository'),
    content: z.string().describe('The file content (will be base64 encoded)'),
    message: z.string().describe('The commit message'),
    branch: z.string().optional().default('main').describe('The branch to commit to'),
  },
  createIssue: {
    owner: z.string().describe('The repository owner'),
    repo: z.string().describe('The repository name'),
    title: z.string().describe('The issue title'),
    body: z.string().optional().describe('The issue body'),
  },
  createPullRequest: {
    owner: z.string().describe('The repository owner'),
    repo: z.string().describe('The repository name'),
    title: z.string().describe('The pull request title'),
    head: z.string().describe('The branch with changes (e.g., "feature-branch")'),
    base: z.string().describe('The branch to merge into (e.g., "main")'),
    body: z.string().optional().describe('The pull request body'),
  },
  listCommits: {
    owner: z.string().describe('The repository owner'),
    repo: z.string().describe('The repository name'),
    branch: z.string().optional().default('main').describe('The branch to list commits from'),
  },
  searchRepositories: {
    query: z.string().describe('The search query (e.g., "language:javascript stars:>1000")'),
  },
  forkRepository: {
    owner: z.string().describe('The owner of the repository to fork'),
    repo: z.string().describe('The name of the repository to fork'),
  },
}
