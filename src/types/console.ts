import type { ConsoleLogEvent as BaseConsoleLogEvent } from '@hawk.so/types';

/**
 * Extended ConsoleLogEvent with styles support for local usage
 */
export interface ExtendedConsoleLogEvent extends Omit<BaseConsoleLogEvent, never> {
  /**
   * Log method used (e.g., "log", "warn", "error")
   */
  method: string;

  /**
   * Timestamp of the log event
   */
  timestamp: Date;

  /**
   * Type of the log message (e.g., "error", "warning", "info")
   */
  type: string;

  /**
   * The main log message
   */
  message: string;

  /**
   * Stack trace if available
   */
  stack?: string;

  /**
   * File and line number where the log occurred
   */
  fileLine?: string;

  /**
   * CSS styles for %c formatting
   */
  styles?: string[];
}
