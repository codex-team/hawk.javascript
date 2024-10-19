/**
 * Logger module
 *
 * @example
 * log('We got an error', 'error')
 */

/**
 * Allow to use global VERSION, that will be overwritten by Webpack
 */
declare const VERSION: string;

/**
 * Custom logger
 *
 * @param {string} msg  - message
 * @param {string} type - logging type 'log'|'warn'|'error'|'info'
 * @param {*} [args]      - argument to log with a message
 * @param {string} style  - additional styling to message
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function log(msg: string, type = 'log', args?: any, style = 'color: inherit'): void {
  if (!('console' in window) || !window.console[type]) {
    return;
  }

  const editorLabelText = `Hawk (${VERSION})`;
  const editorLabelStyle = `line-height: 1em;
            color: #fff;
            display: inline-block;
            line-height: 1em;
            background-color: rgba(0,0,0,.7);
            padding: 3px 5px;
            border-radius: 3px;
            margin-right: 2px`;

  try {
    if (['time', 'timeEnd'].includes(type)) {
      console[type](`( ${editorLabelText} ) ${msg}`);
    } else if (args) {
      console[type](`%c${editorLabelText}%c ${msg} %o`, editorLabelStyle, style, args);
    } else {
      console[type](`%c${editorLabelText}%c ${msg}`, editorLabelStyle, style);
    }
  } catch (ignored) {}
}
