const config = require('../config');
const Socket = require('./socket');
const logger = require('./logger');

/**
 * Listeners for websocket events
 */
const socketHandlers = {
  message(data) {
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

  close() {
    logger.log(
      "Connection lost. Errors won't be save. Please, refresh the page",
      'warn'
    );
  }
};

/**
 * @typedef {Object} HawkClientSettings
 * @property {string} token - personal token
 * @property {string} host - optional: client catcher hostname
 * @property {Number} port - optional: client catcher port
 * @property {string} path - hawk catcher route
 * @property {Boolean} secure - pass FALSE to disable secure connection
 * @property {string} revision - identifier of bundle's revision
 */

/**
 * Hawk client for error catching
 */
class HawkClient {
  /**
   * Hawk client constructor
   * @param {HawkClientSettings|string} settings - settings object or token
   */
  constructor(settings) {
    if (typeof settings === 'string') {
      this.token = settings;
    } else {
      this.token = settings.token;
      this.host = settings.host;
      this.port = settings.port;
      this.path = settings.path;
      this.secure = settings.secure;
      this.revision = settings.revision;
    }

    config.socket.host = this.host || config.socket.host;
    config.socket.port = this.port || config.socket.port;
    config.socket.path = this.path || config.socket.path;
    config.socket.secure = !!this.secure;

    if (!this.token) {
      logger.log(
        'Please, pass your verification token for Hawk error tracker. You can get it on hawk.so',
        'warn'
      );
      return;
    }

    const socketSettings = config.socket;

    socketSettings.onmessage = socketHandlers.message;
    socketSettings.onclose = socketHandlers.close;

    this.ws = new Socket(socketSettings);

    window.addEventListener('error', (e) => this.handleError(e));
  }

  /**
   * Send test event from client
   */
  test() {
    const fakeEvent = {
      message: 'Hawk client catcher test',
      filename: 'hawk.js',
      lineno: 0,
      colno: 0,
      error: {
        stack: 'hawk.js'
      }
    };

    this.handleError(fakeEvent);
  }

  /**
   * Handles the error and sends it to the server
   * @param {Error} ErrorEvent - occurred event
   */
  handleError(ErrorEvent) {
    const error = {
      token: this.token,
      // eslint-disable-next-line camelcase
      catcher_type: 'errors/javascript',
      payload: {
        message: ErrorEvent.message,
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
          ua: window.navigator.userAgent,
          frame: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        }
      }
    };

    this.ws.send(error);
  }
}

module.exports = HawkClient;
