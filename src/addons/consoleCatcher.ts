/**
 * @file Module for intercepting console logs with stack trace capture
 */
import type { ConsoleLogEvent } from '@hawk.so/types';
import Sanitizer from '../modules/sanitizer';

/**
 * Maximum number of console logs to store
 */
const MAX_LOGS = 20;

/**
 * Console methods to intercept
 */
const CONSOLE_METHODS: string[] = ['log', 'warn', 'error', 'info', 'debug'];

/**
 * Console catcher class for intercepting and capturing console logs
 */
export class ConsoleCatcher {
  /**
   * Singleton instance
   */
  private static instance: ConsoleCatcher | null = null;

  /**
   * Console output buffer
   */
  private readonly consoleOutput: ConsoleLogEvent[] = [];

  /**
   * Initialization flag
   */
  private isInitialized = false;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): ConsoleCatcher {
    ConsoleCatcher.instance ??= new ConsoleCatcher();

    return ConsoleCatcher.instance;
  }

  /**
   * Converts any argument to its string representation
   *
   * @param arg - Value to convert to string
   * @throws Error if the argument can not be stringified, for example by such reason:
   *  SecurityError: Failed to read a named property 'toJSON' from 'Window': Blocked a frame with origin "https://codex.so" from accessing a cross-origin frame.
   */
  private stringifyArg(arg: unknown): string {
    if (typeof arg === 'string') {
      return arg;
    }
    if (typeof arg === 'number' || typeof arg === 'boolean') {
      return String(arg);
    }

    /**
     * Sanitize the argument before stringifying to handle circular references, deep objects, etc
     * And then it can be stringified safely
     */
    const sanitized = Sanitizer.sanitize(arg);

    return JSON.stringify(sanitized);
  }

  /**
   * Formats console arguments handling %c directives
   *
   * @param args - Console arguments that may include style directives
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
        message: args.map(arg => {
          try {
            return this.stringifyArg(arg);
          } catch (error) {
            return '[Error stringifying argument: ' + (error instanceof Error ? error.message : String(error)) + ']';
          }
        }).join(' '),
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
      .map(arg => {
        try {
          return this.stringifyArg(arg);
        } catch (error) {
          return '[Error stringifying argument: ' + (error instanceof Error ? error.message : String(error)) + ']';
        }
      })
      .join(' ');

    return {
      message: message + (remainingArgs ? ' ' + remainingArgs : ''),
      styles,
    };
  }

  /**
   * Adds a console log event to the output buffer
   *
   * @param logEvent - The console log event to be added to the output buffer
   */
  private addToConsoleOutput(logEvent: ConsoleLogEvent): void {
    if (this.consoleOutput.length >= MAX_LOGS) {
      this.consoleOutput.shift();
    }
    this.consoleOutput.push(logEvent);
  }

  /**
   * Creates a console log event from an error or promise rejection
   *
   * @param event - The error event or promise rejection event to convert
   */
  private createConsoleEventFromError(event: ErrorEvent | PromiseRejectionEvent): ConsoleLogEvent {
    if (event instanceof ErrorEvent) {
      return {
        method: 'error',
        timestamp: new Date(),
        type: event.error?.name || 'Error',
        message: event.error?.message || event.message,
        stack: event.error?.stack || '',
        fileLine: event.filename
          ? `${event.filename}:${event.lineno}:${event.colno}`
          : '',
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
   * Initializes the console interceptor by overriding default console methods
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  public init(): void {
    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;

    CONSOLE_METHODS.forEach((method) => {
      if (typeof window.console[method] !== 'function') {
        return;
      }

      const oldFunction = window.console[method].bind(window.console);

      window.console[method] = (...args: unknown[]): void => {
        const errorStack = new Error('Console log stack trace').stack;
        const stackLines = errorStack?.split('\n') || [];

        // Skip first line (Error message) and find first stack frame outside of consoleCatcher module
        const consoleCatcherPattern = /consoleCatcher/i;
        let userFrameIndex = 1; // Skip Error message line

        for (let i = 1; i < stackLines.length; i++) {
          if (!consoleCatcherPattern.test(stackLines[i])) {
            userFrameIndex = i;
            break;
          }
        }

        const userStack = stackLines.slice(userFrameIndex).join('\n');
        const fileLine = stackLines[userFrameIndex]?.trim() || '';
        const { message, styles } = this.formatConsoleArgs(args);

        const logEvent: ConsoleLogEvent = {
          method,
          timestamp: new Date(),
          type: method,
          message,
          stack: userStack,
          fileLine,
          styles,
        };

        this.addToConsoleOutput(logEvent);
        oldFunction(...args);
      };
    });
  }

  /**
   * Handles error events by converting them to console log events
   *
   * @param event - The error or promise rejection event to handle
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  public addErrorEvent(event: ErrorEvent | PromiseRejectionEvent): void {
    const logEvent = this.createConsoleEventFromError(event);

    this.addToConsoleOutput(logEvent);
  }

  /**
   * Returns the current console output buffer
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  public getConsoleLogStack(): ConsoleLogEvent[] {
    return [ ...this.consoleOutput ];
  }
}
