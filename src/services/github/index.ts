import { config } from '@/config/environment'
import { GitHubApiOptions } from './types'

/**
 * GitHub API client for making authenticated requests
 */
export class GitHubService {
  private readonly baseUrl = 'https://api.github.com'
  private readonly token: string

  constructor(token?: string) {
    this.token = token || config.github.personalAccessToken
    if (!this.token) {
      throw new Error('GitHub personal access token is required')
    }
  }

  /**
   * Make an authenticated request to the GitHub API
   * @param endpoint - API endpoint path (starting with /)
   * @param options - Request options
   * @returns JSON response from GitHub API
   */
  async request<T>(endpoint: string, options: GitHubApiOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const method = options.method || 'GET'

    const headers: Record<string, string> = {
      'Authorization': `token ${this.token}`,
      'Accept': 'application/vnd.github+json',
      ...options.headers,
    }

    // Add Content-Type header for requests with body
    if (options.body) {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(url, {
      method,
      headers,
      body: options.body,
    })

    const responseData = await response.json()

    if (!response.ok) {
      const error = new Error(`GitHub API error: ${response.status} ${response.statusText}`)
      Object.assign(error, { status: response.status, data: responseData })
      throw error
    }

    return responseData as T
  }

  /**
   * Get user information for the authenticated user
   */
  async getAuthenticatedUser() {
    return this.request('/user')
  }
}

// Export a singleton instance for convenience
export const githubService = new GitHubService()
