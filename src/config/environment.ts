import dotenv from 'dotenv'

dotenv.config()

export const environment = {
  port: process.env.PORT || 3000,
  github: {
    token: process.env.GITHUB_TOKEN,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  nodeEnv: process.env.NODE_ENV || 'development',
} as const

export type Environment = typeof environment;
