/**
 * Log level type for categorizing log messages.
 *
 * Includes standard console methods supported in both browser and Node.js:
 * - Standard levels: `log`, `warn`, `error`, `info`
 * - Performance timing: `time`, `timeEnd`
 */
export type LogType = 'log' | 'warn' | 'error' | 'info' | 'time' | 'timeEnd';

/**
 * Logger function interface for environment-specific logging implementations.
 *
 * Implementations should handle message formatting, output styling,
 * and platform-specific logging mechanisms (e.g., console, file, network).
 *
 * @param msg - The message to log.
 * @param type - Log level/severity (default: 'log').
 * @param args - Additional data to include with the log message.
 */
export interface Logger {
  (msg: string, type?: LogType, args?: unknown): void;
}

/**
 * Global logger instance, set by environment-specific packages.
 */
let loggerInstance: Logger | null = null;

/**
 * Checks if logger instance has been registered.
 */
export function isLoggerSet(): boolean {
  return loggerInstance !== null;
}

/**
 * Registers the environment-specific logger implementation.
 *
 * This should be called once during application initialization
 * by the environment-specific package.
 *
 * @param logger - Logger implementation to use globally.
 */
export function setLogger(logger: Logger): void {
  loggerInstance = logger;
}

/**
 * Clears the registered logger instance.
 */
export function resetLogger(): void {
  loggerInstance = null;
}

/**
 * Logs a message using the registered logger implementation.
 *
 * If no logger has been registered via {@link setLogger}, this is a no-op.
 *
 * @param msg - Message to log.
 * @param type - Log level (default: 'log').
 * @param args - Additional arguments to log.
 */
export function log(msg: string, type?: LogType, args?: unknown): void {
  if (loggerInstance) {
    loggerInstance(msg, type, args);
  }
}
