/**
 * Structured logging utility
 * Provides consistent logging across the application with configurable log levels
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

type LogContext = Record<string, unknown>

class Logger {
  private minLevel: LogLevel

  constructor() {
    // Set log level based on environment
    const envLevel = process.env.LOG_LEVEL?.toUpperCase()
    this.minLevel = this.parseLogLevel(envLevel)
  }

  private parseLogLevel(level?: string): LogLevel {
    switch (level) {
      case 'DEBUG':
        return LogLevel.DEBUG
      case 'INFO':
        return LogLevel.INFO
      case 'WARN':
        return LogLevel.WARN
      case 'ERROR':
        return LogLevel.ERROR
      case 'NONE':
        return LogLevel.NONE
      default:
        // Default to INFO in production, DEBUG in development
        return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level}] ${message}${contextStr}`
  }

  /**
   * Log debug information (verbose, only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('DEBUG', message, context))
    }
  }

  /**
   * Log informational messages
   */
  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage('INFO', message, context))
    }
  }

  /**
   * Log warning messages
   */
  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message, context))
    }
  }

  /**
   * Log error messages
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorContext = {
        ...context,
        ...(error instanceof Error
          ? {
              error: error.message,
              stack: error.stack,
            }
          : { error: String(error) }),
      }
      console.error(this.formatMessage('ERROR', message, errorContext))
    }
  }

  /**
   * Legacy support for gradual migration from console.log
   * @deprecated Use logger.debug() or logger.info() instead
   */
  log(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('LOG', message, { args }))
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export convenience functions
export const log = logger.log.bind(logger)
export const debug = logger.debug.bind(logger)
export const info = logger.info.bind(logger)
export const warn = logger.warn.bind(logger)
export const error = logger.error.bind(logger)
