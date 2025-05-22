/**
 * @file Module for intercepting console logs with stack trace capture
 */
import safeStringify from 'safe-stringify';
import type { ConsoleLogEvent } from '@hawk.so/types';

/**
 * Creates a console interceptor that captures and formats console output
 */
function createConsoleCatcher(): {
  initConsoleCatcher: () => void;
  addErrorEvent: (event: ErrorEvent | PromiseRejectionEvent) => void;
  getConsoleLogStack: () => ConsoleLogEvent[];
  } {
  const MAX_LOGS = 20;
  const consoleOutput: ConsoleLogEvent[] = [];
  let isInitialized = false;

  /**
   * Converts any argument to its string representation
   *
   * @param arg - Value to convert to string
   * @throws Error if the argument can not be stringified, for example by such reason:
   *  SecurityError: Failed to read a named property 'toJSON' from 'Window': Blocked a frame with origin "https://codex.so" from accessing a cross-origin frame.
   */
  function stringifyArg(arg: unknown): string {
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
   *
   * @param args - Console arguments that may include style directives
   */
  function formatConsoleArgs(args: unknown[]): {
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
            return stringifyArg(arg);
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
          return stringifyArg(arg);
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
  function addToConsoleOutput(logEvent: ConsoleLogEvent): void {
    if (consoleOutput.length >= MAX_LOGS) {
      consoleOutput.shift();
    }
    consoleOutput.push(logEvent);
  }

  /**
   * Creates a console log event from an error or promise rejection
   *
   * @param event - The error event or promise rejection event to convert
   */
  function createConsoleEventFromError(
    event: ErrorEvent | PromiseRejectionEvent
  ): ConsoleLogEvent {
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
  function initConsoleCatcher(): void {
    if (isInitialized) {
      return;
    }

    isInitialized = true;
    const consoleMethods: string[] = ['log', 'warn', 'error', 'info', 'debug'];

    consoleMethods.forEach(function overrideConsoleMethod(method) {
      if (typeof window.console[method] !== 'function') {
        return;
      }

      const oldFunction = window.console[method].bind(window.console);

      window.console[method] = function (...args: unknown[]): void {
        const stack = new Error().stack?.split('\n').slice(2)
          .join('\n') || '';
        const { message, styles } = formatConsoleArgs(args);

        const logEvent: ConsoleLogEvent = {
          method,
          timestamp: new Date(),
          type: method,
          message,
          stack,
          fileLine: stack.split('\n')[0]?.trim(),
          styles,
        };

        addToConsoleOutput(logEvent);
        oldFunction(...args);
      };
    });
  }

  /**
   * Handles error events by converting them to console log events
   *
   * @param event - The error or promise rejection event to handle
   */
  function addErrorEvent(event: ErrorEvent | PromiseRejectionEvent): void {
    const logEvent = createConsoleEventFromError(event);

    addToConsoleOutput(logEvent);
  }

  /**
   * Returns the current console output buffer
   */
  function getConsoleLogStack(): ConsoleLogEvent[] {
    return [ ...consoleOutput ];
  }

  return {
    initConsoleCatcher,
    addErrorEvent,
    getConsoleLogStack,
  };
}

const consoleCatcher = createConsoleCatcher();

export const { initConsoleCatcher, getConsoleLogStack, addErrorEvent } =
  consoleCatcher;
