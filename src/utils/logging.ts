/**
 * Log entry interface
 */
export type LogEntry = {
  type: 'log' | 'error' | 'info' | 'warn';
  timestamp: Date;
  messages: any[];
}

/**
 * Logger class for handling and buffering logs
 */
export class Logger {
  private buffer: LogEntry[] = []
  private flushInterval: NodeJS.Timeout | null = null
  private readonly flushIntervalMs: number

  /**
   * Create a new Logger instance
   * @param flushIntervalMs - How often (in ms) to flush the log buffer to console
   */
  constructor(flushIntervalMs = 100) {
    this.flushIntervalMs = flushIntervalMs
  }

  /**
   * Add a log entry to the buffer
   * @param type - Type of log entry
   * @param messages - Messages to log
   */
  private addEntry(type: LogEntry['type'], ...messages: any[]): void {
    this.buffer.push({
      type,
      timestamp: new Date(),
      messages,
    })
  }

  /**
   * Log info level message
   * @param messages - Messages to log
   */
  info(...messages: any[]): void {
    this.addEntry('info', ...messages)
  }

  /**
   * Log standard message
   * @param messages - Messages to log
   */
  log(...messages: any[]): void {
    this.addEntry('log', ...messages)
  }

  /**
   * Log warning message
   * @param messages - Messages to log
   */
  warn(...messages: any[]): void {
    this.addEntry('warn', ...messages)
  }

  /**
   * Log error message
   * @param messages - Messages to log
   */
  error(...messages: any[]): void {
    this.addEntry('error', ...messages)
  }

  /**
   * Start buffering logs
   */
  startBuffering(): void {
    if (this.flushInterval) {
      return
    }

    this.flushInterval = setInterval(() => {
      this.flush()
    }, this.flushIntervalMs)
  }

  /**
   * Stop buffering logs
   */
  stopBuffering(): void {
    if (!this.flushInterval) {
      return
    }

    clearInterval(this.flushInterval)
    this.flushInterval = null
    this.flush() // Flush any remaining logs
  }

  /**
   * Flush log buffer to console
   */
  flush(): void {
    if (this.buffer.length === 0) {
      return
    }

    for (const entry of this.buffer) {
      console[entry.type].apply(console, entry.messages)
    }

    this.buffer = []
  }
}

// Export a singleton logger instance
export const logger = new Logger()
