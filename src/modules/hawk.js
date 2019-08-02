// eslint-disable-next-line multiline-comment-style
/*!
 * Hawk client for error catching
 * @usage
 * const hawk = new HawkClient('token');
 * hawk.test();
 * hawk.handleEvent();
 */

const config = require('../config');
const Socket = require('./socket');
const logger = require('./logger');

/**
 * Listeners for websocket events
 */
const socketHandlers = {
  /**
   * Handles new messages from the socket
   * @param {{data: string}} response - response from Socket
   */
  message(response) {
    let message, type;

    try {
      response = JSON.parse(response.data);
      type = response.type;
      message = response.message;
    } catch (e) {
      message = response.data;
      type = 'info';
    }

    logger.log('Hawk says: ' + message, type);
  },

  /**
   * Handles close event from the socket
   */
  close() {
    logger.log(
      'Connection lost. Connection will be restored when new errors occurred',
      'info'
    );
  }
};

/**
 * Allows to select only the necessary fields from the error object
 * @param {Object} event - event for filtering
 */
function filterEventFields(event) {
  const necessaryFields = [
    'colno',
    'lineno',
    'filename',
    'message',
    'type',
    'isTrusted',
    'error.message',
    'error.stack'
  ];

  const result = {};

  necessaryFields.forEach(fieldPath => {
    const fields = fieldPath.split('.');
    let eventCache = event;
    let resultCache = result;

    for (let i = 0, length = fields.length; i < length; i++) {
      const fieldName = fields[i];

      if (!eventCache[fieldName]) {
        break;
      }
      eventCache = eventCache[fieldName];
      if (i === length - 1) {
        resultCache[fieldName] = eventCache;
      } else {
        resultCache = resultCache[fieldName] = {};
      }
    }
  });
  return result;
}

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
 * @usage
 * const hawk = new HawkClient('token');
 * hawk.test();
 * hawk.handleEvent();
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
        'Please, pass your integration token for Hawk error tracker. You can get it on hawk.so',
        'warn'
      );
      return;
    }

    const socketSettings = config.socket;

    socketSettings.onmessage = socketHandlers.message;
    socketSettings.onclose = socketHandlers.close;

    this.ws = new Socket(socketSettings);

    window.addEventListener('error', (e) => this.handleEvent(e));
    window.addEventListener('unhandledrejection', (e) => this.handleEvent(e));
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

    this.handleEvent(fakeEvent);
  }

  /**
   * Handles the event and sends it to the server
   * @param {Object} event - occurred event
   */
  handleEvent(event) {
    const data = {
      token: this.token,
      // eslint-disable-next-line camelcase
      catcher_type: 'errors/javascript',
      payload: {
        event: filterEventFields(event),
        revision: this.revision || null,
        location: {
          url: window.location.href,
          origin: window.location.origin,
          host: window.location.hostname,
          path: window.location.pathname,
          port: window.location.port
        },
        timestamp: Date.now(),
        navigator: {
          ua: window.navigator.userAgent,
          frame: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        }
      }
    };

    this.ws.send(data);
  }
}

module.exports = HawkClient;
