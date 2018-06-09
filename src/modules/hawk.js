/*!
 * Codex Hawk client side module
 * https://github.com/codex-team/hawk.client
 *
 * Codex Hawk - https://hawk.so
 * Codex Team - https://ifmo.su
 *
 * @license MIT (c) CodeX 2017
 */
module.exports = function () {
  'use strict';

  let config = require('../config'),
    websocket = require('./websocket'),
    logger = require('./logger'),
    ws = null,
    _token,
    _revision;

    /**
     * Hawk client constructor
     * @param {object|string} settings - settings object or token
     * @param  {string} settings.token       personal token
     * @param  {string} settings.host        optional: client catcher hostname
     * @param  {Number} settings.port        optional: client catcher port
     * @param  {string} settings.path        hawk catcher route
     * @param  {Boolean} settings.secure     pass FALSE to disable secure connection
     * @param  {string} settings.revision    identifier of bundle's revision
     */
  let init = function (settings) {
    let token, host, port, path, secure, revision;

    if (typeof settings === 'string') {
      token = settings;
    } else {
      ({token, host, port, path, secure, revision} = settings);
    }

    config.socket.host = host || config.socket.host;
    config.socket.port = port || config.socket.port;
    config.socket.path = path || config.socket.path;
    config.socket.secure = secure !== undefined ? secure : config.socket.secure;

    if (!token) {
      logger.log('Please, pass your verification token for Hawk error tracker. You can get it on hawk.so', 'warn');
      return;
    }

    _token = token;

    if (revision) {
      _revision = revision;
    }

    let socket = config.socket;

    socket.onmessage = socketHandlers.message;
    socket.onclose = socketHandlers.close;

    ws = websocket(socket);

    window.addEventListener('error', errorHandler);
  };

  let socketHandlers = {

    message: function (data) {
      let message, type;

      try {
        data = JSON.parse(data.data);
        type = data.type;
        message = data.message;
      } catch (e) {
        message = data.data;
        type = 'info';
      }

      logger.log('Hawk says: ' + message, type);
    },

    close: function () {
      logger.log('Connection lost. Errors won\'t be save. Please, refresh the page', 'warn');
    }

  };

  /**
   * Prepare string for correct JSON stringify
   * @param {string} string
   * @return {string}
   */
  function escapeForJSON(string){
    return string.replace(/\/'/, "'");
  }

    /**
     * Error event handler.
     * Get error params and send to Hawk server
     *
     * @param ErrorEvent
     */
  let errorHandler = function (ErrorEvent) {
    let error = {
      token: _token,
      message: escapeForJSON(ErrorEvent.message),
      'error_location': {
        file: ErrorEvent.filename,
        line: ErrorEvent.lineno,
        col: ErrorEvent.colno,
        revision: _revision || null,
      },
      location: {
        url: window.location.href,
        origin: window.location.origin,
        host: window.location.hostname,
        path: window.location.pathname,
        port: window.location.port
      },
      stack: ErrorEvent.error.stack || ErrorEvent.error.stacktrace,
      time: Date.now(),
      navigator: {
        ua: escapeForJSON(window.navigator.userAgent),
        frame: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    };

    ws.send(error);
  };

  let test = function () {
    let fakeEvent = {
      message: 'Hawk client catcher test',
      filename: 'hawk.js',
      lineno: 0,
      colno: 0,
      error: {
        stack: 'hawk.js'
      }
    };

    errorHandler(fakeEvent);
  };

  return {
    init: init,
    test: test
  };
}();
