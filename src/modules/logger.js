/**
 * Logger module
 *
 * @usage
 * logger.log('We got an error', 'error')
 *
 * @param message
 * @param type - log type: error, warn, info, log, etc.
 */
module.exports.log = function (message, type) {

    type = type || 'info';

    message = '[Codex Hawk]:  ' + message;

    if ('console' in window && window.console[type]) {

        window.console[type](message);

    }

};
