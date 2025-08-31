/**
 * @file Module for intercepting console logs with stack trace capture
 */
import safeStringify from 'safe-stringify';
import type { ConsoleLogEvent } from '@hawk.so/types';

/**
 * Console interceptor that captures and formats console output
 */
export class ConsoleCatcher {
  private readonly MAX_LOGS = 20;
  private readonly consoleOutput: ConsoleLogEvent[] = [];
  private isInitialized = false;
  private isProcessing = false;

  /**
   * Initializes the console interceptor by overriding default console methods
   */
  public init(): void {
    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;
    const consoleMethods: string[] = ['log', 'warn', 'error', 'info', 'debug'];

    consoleMethods.forEach((method) => {
      if (typeof window.console[method] !== 'function') {
        return;
      }

      const oldFunction = window.console[method].bind(window.console);

      window.console[method] = (...args: unknown[]): void => {
        // Prevent recursive calls
        if (this.isProcessing) {
          return oldFunction(...args);
        }

        /**
         * If the console call originates from Vue's internal runtime bundle, skip interception
         * to avoid capturing Vue-internal warnings and causing recursive loops.
         */
        const rawStack = new Error().stack || '';
        if (rawStack.includes('runtime-core.esm-bundler.js')) {
          return oldFunction(...args);
        }

        // Additional protection against Hawk internal calls
        if (rawStack.includes('hawk.javascript') || rawStack.includes('@hawk.so')) {
          return oldFunction(...args);
        }

        this.isProcessing = true;

        try {
          const stack = new Error().stack?.split('\n').slice(2).join('\n') || '';
          const { message, styles } = this.formatConsoleArgs(args);

          const logEvent: ConsoleLogEvent = {
            method,
            timestamp: new Date(),
            type: method,
            message,
            stack,
            fileLine: stack.split('\n')[0]?.trim(),
            styles,
          };

          this.addToConsoleOutput(logEvent);
        } catch (error) {
          // Silently ignore errors in console processing to prevent infinite loops
        } finally {
          this.isProcessing = false;
        }

        oldFunction(...args);
      };
    });
  }

  /**
   * Converts any argument to its string representation
   */
  private stringifyArg(arg: unknown): string {
    if (typeof arg === 'string') {
      return arg;
    }
    if (typeof arg === 'number' || typeof arg === 'boolean') {
      return String(arg);
    }

    return safeStringify(arg);
  }

  /**
   * Formats console arguments handling %c directives
   */
  private formatConsoleArgs(args: unknown[]): {
    message: string;
    styles: string[];
  } {
    if (args.length === 0) {
      return {
        message: '',
        styles: [],
      };
    }

    const firstArg = args[0];

    if (typeof firstArg !== 'string' || !firstArg.includes('%c')) {
      return {
        message: args.map((arg) => this.stringifyArg(arg)).join(' '),
        styles: [],
      };
    }

    // Handle %c formatting
    const message = args[0] as string;
    const styles: string[] = [];

    // Extract styles from arguments
    let styleIndex = 0;

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];

      if (typeof arg === 'string' && message.indexOf('%c', styleIndex) !== -1) {
        styles.push(arg);
        styleIndex = message.indexOf('%c', styleIndex) + 2;
      }
    }

    // Add remaining arguments that aren't styles
    const remainingArgs = args
      .slice(styles.length + 1)
      .map((arg) => this.stringifyArg(arg))
      .join(' ');

    return {
      message: message + (remainingArgs ? ' ' + remainingArgs : ''),
      styles,
    };
  }

  /**
   * Adds a console log event to the output buffer
   */
  private addToConsoleOutput(logEvent: ConsoleLogEvent): void {
    if (this.consoleOutput.length >= this.MAX_LOGS) {
      this.consoleOutput.shift();
    }
    this.consoleOutput.push(logEvent);
  }

  /**
   * Creates a console log event from an error or promise rejection
   */
  private createConsoleEventFromError(event: ErrorEvent | PromiseRejectionEvent): ConsoleLogEvent {
    if (event instanceof ErrorEvent) {
      return {
        method: 'error',
        timestamp: new Date(),
        type: event.error?.name || 'Error',
        message: event.error?.message || event.message,
        stack: event.error?.stack || '',
        fileLine: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : '',
      };
    }

    return {
      method: 'error',
      timestamp: new Date(),
      type: 'UnhandledRejection',
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack || '',
      fileLine: '',
    };
  }

  /**
   * Handles error events by converting them to console log events
   */
  public addErrorEvent(event: ErrorEvent | PromiseRejectionEvent): void {
    const logEvent = this.createConsoleEventFromError(event);
    this.addToConsoleOutput(logEvent);
  }

  /**
   * Returns the current console output buffer
   */
  public getConsoleLogStack(): ConsoleLogEvent[] {
    return [...this.consoleOutput];
  }
}
