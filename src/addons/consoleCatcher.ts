/**
 * @file Module for intercepting console logs with stack trace capture
 */
import safeStringify from 'safe-stringify';
import type { ConsoleLogEvent } from '@hawk.so/types';

const createConsoleCatcher = (): {
  initConsoleCatcher: () => void;
  addErrorEvent: (event: ErrorEvent | PromiseRejectionEvent) => void;
  getConsoleLogStack: () => ConsoleLogEvent[];
} => {
  const MAX_LOGS = 20;
  const consoleOutput: ConsoleLogEvent[] = [];
  let isInitialized = false;

  /**
   * Converts any argument to its string representation
   *
   * @param arg - Console arguments
   */
  const stringifyArg = (arg: unknown): string => {
    if (typeof arg === 'string') {
      return arg;
    }
    if (typeof arg === 'number' || typeof arg === 'boolean') {
      return String(arg);
    }

    return safeStringify(arg);
  };

  /**
   * Formats console arguments handling %c directives
   *
   * @param args - Console arguments that may include %c style directives
   */
  const formatConsoleArgs = (
    args: unknown[]
  ): { message: string; styles: string[] } => {
    if (args.length === 0) {
      return { message: '',
        styles: [] };
    }

    const firstArg = args[0];

    if (typeof firstArg !== 'string' || !firstArg.includes('%c')) {
      return {
        message: args.map(stringifyArg).join(' '),
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
      .map(stringifyArg)
      .join(' ');

    return {
      message: message + (remainingArgs ? ' ' + remainingArgs : ''),
      styles,
    };
  };

  const addToConsoleOutput = (logEvent: ConsoleLogEvent): void => {
    if (consoleOutput.length >= MAX_LOGS) {
      consoleOutput.shift();
    }
    consoleOutput.push(logEvent);
  };

  const createConsoleEventFromError = (
    event: ErrorEvent | PromiseRejectionEvent
  ): ConsoleLogEvent => {
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
  };

  return {
    initConsoleCatcher(): void {
      if (isInitialized) {
        return;
      }

      isInitialized = true;
      const consoleMethods: string[] = [
        'log',
        'warn',
        'error',
        'info',
        'debug',
      ];

      consoleMethods.forEach((method) => {
        if (typeof window.console[method] !== 'function') {
          return;
        }

        const oldFunction = window.console[method].bind(window.console);

        window.console[method] = function (...args: unknown[]): void {
          const stack =
            new Error().stack?.split('\n').slice(2)
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
    },

    addErrorEvent(event: ErrorEvent | PromiseRejectionEvent): void {
      const logEvent = createConsoleEventFromError(event);

      addToConsoleOutput(logEvent);
    },

    getConsoleLogStack(): ConsoleLogEvent[] {
      return [ ...consoleOutput ];
    },
  };
};

const consoleCatcher = createConsoleCatcher();

export const { initConsoleCatcher, getConsoleLogStack, addErrorEvent } =
  consoleCatcher;
