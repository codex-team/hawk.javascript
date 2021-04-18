/**
 * @file Integration for catching console logs and other info
 */

interface ConsoleLogEvent {
    /**
     * Window.console object method (i.e. log, info, warn)
     */
    method: string;

    /**
     * Time when the log was occurred
     */
    timestamp: Date;

    /**
     * Log argument
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: any;
}

/**
 * Contains all data that will be logged by window.console
 */
const consoleOutput: ConsoleLogEvent[] = [];

// Override console methods
Object.keys(window.console).forEach(key => {
  const oldFunction = window.console[key];

  window.console[key] = function (...args): void {
    consoleOutput.push({
      method: key,
      timestamp: new Date(),
      args,
    });
    oldFunction.apply(window.console, args);
  };
});

/**
 * @param event - event to modify
 * @param data - event data
 */
export default function (event, data): void {
  data.payload.consoleOutput = consoleOutput;
}
