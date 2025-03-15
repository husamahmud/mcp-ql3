import { createClient, RedisClientType } from 'redis'
import { config } from '@/config/environment'

/**
 * Redis client service
 * Manages Redis connections and provides access to Redis functionality
 */
export class RedisService {
  private client: RedisClientType
  private publisher: RedisClientType
  private readonly connectionPromise: Promise<void>
  private isConnected = false

  constructor() {
    const url = config.redis.url
    if (!url) {
      throw new Error('Redis URL is required')
    }

    this.client = createClient({ url })
    this.publisher = createClient({ url })

    this.setupErrorHandlers()
    this.connectionPromise = this.connect()
  }

  /**
   * Set up error handlers for Redis clients
   */
  private setupErrorHandlers(): void {
    this.client.on('error', (err: Error) => {
      console.error('Redis client error:', err)
    })

    this.publisher.on('error', (err: Error) => {
      console.error('Redis publisher error:', err)
    })
  }

  /**
   * Connect to Redis
   */
  private async connect(): Promise<void> {
    if (this.isConnected) {
      return
    }

    await Promise.all([
      this.client.connect(),
      this.publisher.connect(),
    ])

    this.isConnected = true
    console.log('Connected to Redis')
  }

  /**
   * Wait for Redis connection to be established
   */
  async waitForConnection(): Promise<void> {
    return this.connectionPromise
  }

  /**
   * Subscribe to a Redis channel
   * @param channel - Channel to subscribe to
   * @param callback - Callback function to handle messages
   */
  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    await this.waitForConnection()
    await this.client.subscribe(channel, callback)
    console.log(`Subscribed to channel: ${channel}`)
  }

  /**
   * Unsubscribe from a Redis channel
   * @param channel - Channel to unsubscribe from
   * @param callback - Callback function that was handling messages
   */
  async unsubscribe(channel: string, callback: (message: string) => void): Promise<void> {
    if (!this.isConnected) return
    await this.client.unsubscribe(channel, callback)
    console.log(`Unsubscribed from channel: ${channel}`)
  }

  /**
   * Publish a message to a Redis channel
   * @param channel - Channel to publish to
   * @param message - Message to publish
   */
  async publish(channel: string, message: string): Promise<number> {
    await this.waitForConnection()
    return this.publisher.publish(channel, message)
  }

  /**
   * Close Redis connections
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) return

    await Promise.all([
      this.client.disconnect(),
      this.publisher.disconnect(),
    ])

    this.isConnected = false
    console.log('Disconnected from Redis')
  }
}

// Export a singleton instance for convenience
export const redisService = new RedisService()
