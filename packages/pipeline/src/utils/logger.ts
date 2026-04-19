/**
 * Structured logging utility for the Recipe Ingestion Pipeline
 * 
 * Provides JSON-formatted logging with timestamp, level, stage, message, and metadata fields.
 * Supports debug, info, warn, and error log levels.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type PipelineStage = 
  | 'fetch' 
  | 'parse' 
  | 'match' 
  | 'aggregate' 
  | 'normalize' 
  | 'store'
  | 'config'
  | 'job';

export interface LogEntry {
  timestamp: string; // ISO 8601 format
  level: LogLevel;
  stage: PipelineStage;
  message: string;
  metadata?: Record<string, unknown>;
}

export class Logger {
  private minLevel: LogLevel;
  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(minLevel: LogLevel = 'info') {
    this.minLevel = minLevel;
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Log a debug message
   */
  debug(stage: PipelineStage, message: string, metadata?: Record<string, unknown>): void {
    this.log('debug', stage, message, metadata);
  }

  /**
   * Log an info message
   */
  info(stage: PipelineStage, message: string, metadata?: Record<string, unknown>): void {
    this.log('info', stage, message, metadata);
  }

  /**
   * Log a warning message
   */
  warn(stage: PipelineStage, message: string, metadata?: Record<string, unknown>): void {
    this.log('warn', stage, message, metadata);
  }

  /**
   * Log an error message
   */
  error(stage: PipelineStage, message: string, metadata?: Record<string, unknown>): void {
    this.log('error', stage, message, metadata);
  }

  /**
   * Core logging method that formats and outputs structured JSON logs
   */
  private log(
    level: LogLevel,
    stage: PipelineStage,
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    // Check if this log level should be output
    if (this.levelPriority[level] < this.levelPriority[this.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      stage,
      message,
      ...(metadata && { metadata }),
    };

    // Output as JSON to stdout
    console.log(JSON.stringify(entry));
  }
}

// Export a default logger instance
export const logger = new Logger();
