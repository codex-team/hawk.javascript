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
   * Initializes the console interceptor by overriding default console methods
   */
  public init(): void {
    if (this.isInitialized) {
      return;
    }

    const G =
      typeof globalThis !== 'undefined'
        ? globalThis
        : typeof window !== 'undefined'
        ? window
        : undefined;

    if (!G || !G.console) {
      return;
    }

    this.isInitialized = true;

    for (const method of CONSOLE_METHODS) {
      const consoleMethod = this.getConsoleMethod(G.console, method);

      if (!consoleMethod) {
        continue;
      }

      const oldFunction = consoleMethod.bind(G.console);

      G.console[method] = (...args: unknown[]): void => {
        const errorStack = new Error().stack;
        const stack = errorStack?.split('\n').slice(2).join('\n') || '';
        const stackLines = stack.split('\n');
        const fileLine = stackLines.length > 0 ? stackLines[0]?.trim() || '' : '';
        const { message, styles } = this.formatConsoleArgs(args);

        const logEvent: ConsoleLogEvent = {
          method,
          timestamp: new Date(),
          type: method,
          message,
          stack,
          fileLine,
          styles,
        };

        this.addToConsoleOutput(logEvent);
        oldFunction(...args);
      };
    }
  }

  /**
   * Handles error events by converting them to console log events
   *
   * @param event - The error or promise rejection event to handle
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
   * Handles errors during stringification and returns error message
   *
   * @param error - Error that occurred during stringification
   * @returns Error message string
   */
  private getStringifyErrorMessage(error: unknown): string {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return `[Error stringifying argument: ${errorMessage}]`;
  }

  /**
   * Type guard for console method access
   *
   * @param console - Console object
   * @param method - Method name to check
   * @returns Console method if it exists and is a function, null otherwise
   */
  private getConsoleMethod(
    console: Console,
    method: string
  ): ((...args: unknown[]) => void) | null {
    const methodValue = console[method as keyof Console];

    if (typeof methodValue === 'function') {
      return methodValue as (...args: unknown[]) => void;
    }

    return null;
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
        message: args
          .map((arg) => {
            try {
              return this.stringifyArg(arg);
            } catch (error) {
              return this.getStringifyErrorMessage(error);
            }
          })
          .join(' '),
        styles: [],
      };
    }

    // --- Improved %c parsing logic ---
    const message = firstArg as string;
    const styleCount = (message.match(/%c/g) || []).length;

    // take only string styles (others safely stringified)
    const styles = args
      .slice(1, 1 + styleCount)
      .map((style) => (typeof style === 'string' ? style : String(style)));

    // Remaining args after style directives
    const remainingArgs = args
      .slice(1 + styleCount)
      .map((arg) => {
        try {
          return this.stringifyArg(arg);
        } catch (error) {
          return this.getStringifyErrorMessage(error);
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
}
