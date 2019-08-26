/**
 * Logger module
 *
 * @usage
 * log('We got an error', 'error')
 *
 * @param message
 * @param type - log type: error, warn, info, log, etc.
 * @param {*} arg - logging argument
 */
export default function log(message, type, arg) {
  type = type || 'info';

  message = '[CodeX Hawk]: ' + message;

  if ('console' in window && window.console[type]) {
    if (arg !== undefined) {
      window.console[type](message, arg);
    } else {
      window.console[type](message);
    }
  }
}
