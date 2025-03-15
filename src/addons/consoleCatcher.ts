/**
 * @file Module for intercepting console logs with stack trace capture
 */

import { ConsoleLogEvent } from "@hawk.so/types/build/src/base/event/addons/javascript";

const MAX_LOGS = 20;
const consoleOutput: ConsoleLogEvent[] = [];

let isInitialized = false;

export function initConsoleCatcher(): void {
  if (isInitialized) return;
  isInitialized = true;

  const consoleMethods = ["log", "warn", "error", "info", "debug"];

  consoleMethods.forEach((method) => {
    if (typeof window.console[method] !== "function") return;

    const oldFunction = window.console[method].bind(window.console);

    window.console[method] = function (...args): void {
      if (consoleOutput.length >= MAX_LOGS) {
        consoleOutput.shift();
      }

      const stack = new Error().stack?.split("\n").slice(2).join("\n") || "";

      const logEvent: ConsoleLogEvent = {
        method,
        timestamp: new Date(),
        type: method,
        message: args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '),
        stack,
        fileLine: stack.split('\n')[0]?.trim(),
      };

      consoleOutput.push(logEvent);
      oldFunction(...args);
    };
  });

  window.addEventListener("error", function(event) {
    if (consoleOutput.length >= MAX_LOGS) {
      consoleOutput.shift();
    }

    const logEvent: ConsoleLogEvent = {
      method: 'error',
      timestamp: new Date(),
      type: event.error?.name || 'Error',
      message: event.error?.message || event.message,
      stack: event.error?.stack || '',
      fileLine: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : '',
    };

    consoleOutput.push(logEvent);
  });
}

export function getConsoleLogStack(): ConsoleLogEvent[] {
  return [...consoleOutput];
}
