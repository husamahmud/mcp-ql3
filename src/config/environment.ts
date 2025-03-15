export const config = {
  // GitHub configuration
  github: {
    personalAccessToken: process.env.GITHUB_PERSONAL_ACCESS_TOKEN as string,
  },

  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || '',
  },

  // Server configuration
  server: {
    maxDuration: 55, // seconds (5s less than Vercel's limit to allow for cleanup)
  },

  // Validate required environment variables
  validate(): void {
    if (!this.github.personalAccessToken) {
      throw new Error('GITHUB_PERSONAL_ACCESS_TOKEN is not set')
    }

    if (!this.redis.url) {
      throw new Error('REDIS_URL or KV_URL environment variable is not set')
    }
  },
}
