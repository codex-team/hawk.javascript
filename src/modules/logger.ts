/**
 * Logger module
 *
 * @usage
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
export default function log(msg: string, type: string = 'log', args?: any, style: string = 'color: inherit'): void {

  if ( !('console' in window) || !window.console[ type ] ) {
    return;
  }

  const editorLabelText = `Hawk JavaScript.js ${VERSION}`;
  const editorLabelStyle = `line-height: 1em;
            color: #006FEA;
            display: inline-block;
            font-size: 11px;
            line-height: 1em;
            background-color: #fff;
            padding: 4px 9px;
            border-radius: 30px;
            border: 1px solid rgba(56, 138, 229, 0.16);
            margin: 4px 5px 4px 0;`;

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
