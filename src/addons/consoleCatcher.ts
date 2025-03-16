/**
 * @file Module for intercepting console logs with stack trace capture
 */

import type { ConsoleLogEvent } from '@hawk.so/types';

const createConsoleCatcher = (): {
  initConsoleCatcher: () => void;
  addErrorEvent: (event: ErrorEvent | PromiseRejectionEvent) => void;
  getConsoleLogStack: () => ConsoleLogEvent[];
} => {
  const MAX_LOGS = 20;
  const consoleOutput: ConsoleLogEvent[] = [];
  let isInitialized = false;

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
      const consoleMethods: string[] = ['log', 'warn', 'error', 'info', 'debug'];

      consoleMethods.forEach((method) => {
        if (typeof window.console[method] !== 'function') {
          return;
        }

        const oldFunction = window.console[method].bind(window.console);

        window.console[method] = function (...args: unknown[]): void {
          const stack = new Error().stack?.split('\n').slice(2)
            .join('\n') || '';

          const logEvent: ConsoleLogEvent = {
            method,
            timestamp: new Date(),
            type: method,
            message: args.map((arg) => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '),
            stack,
            fileLine: stack.split('\n')[0]?.trim(),
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

export const { initConsoleCatcher, getConsoleLogStack, addErrorEvent } = consoleCatcher;
