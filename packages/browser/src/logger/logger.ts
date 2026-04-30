import type { Logger, LogType } from '@hawk.so/core';

/**
 * Creates a browser console logger with Hawk branding and styled output.
 *
 * The logger outputs to `window.console` with a dark label badge
 * containing the Hawk version. Messages are formatted with CSS
 * styling for better visibility in browser developer tools.
 *
 * @param version - Version string to display in log messages.
 * @param style - Optional CSS style for the message text (default: 'color: inherit').
 * @returns {Logger} Logger function implementation for browser environments.
 *
 * @example
 * ```TypeScript
 * import { createBrowserLogger } from '@hawk.so/browser';
 * import { setLogger } from '@hawk.so/core';
 *
 * const logger = createBrowserLogger('3.2.0');
 * setLogger(logger);
 *
 * // Custom styling
 * const styledLogger = createBrowserLogger('3.2.0', 'color: blue; font-weight: bold');
 * setLogger(styledLogger);
 * ```
 */
export function createBrowserLogger(version: string, style = 'color: inherit'): Logger {
  return (msg: string, type: LogType = 'log', args?: unknown): void => {
    if (!('console' in window)) {
      return;
    }

    const editorLabelText = `Hawk (${version})`;
    const editorLabelStyle = `line-height: 1em;
            color: #fff;
            display: inline-block;
            background-color: rgba(0,0,0,.7);
            padding: 3px 5px;
            border-radius: 3px;
            margin-right: 2px`;

    try {
      switch (type) {
        case 'time':
        case 'timeEnd':
          console[type](`( ${editorLabelText} ) ${msg}`);
          break;
        case 'log':
        case 'warn':
        case 'error':
        case 'info':
          if (args !== undefined) {
            console[type](`%c${editorLabelText}%c ${msg} %o`, editorLabelStyle, style, args);
          } else {
            console[type](`%c${editorLabelText}%c ${msg}`, editorLabelStyle, style);
          }
          break;
      }
    } catch (ignored) {}
  };
}
