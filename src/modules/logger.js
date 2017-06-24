module.exports.log = function (message, type) {

  type = type || 'info';

  message = '[Codex Hawk]:  ' + message;

  if ('console' in window && window.console[type]) {

    window.console[type](message);

  }

};
