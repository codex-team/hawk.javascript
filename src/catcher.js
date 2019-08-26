/*!
 * Hawk JavaScript catcher
 * https://github.com/codex-team/hawk.javascript
 *
 * Codex Hawk - https://hawk.so
 * Codex Team - https://codex.so
 *
 * @license MIT (c) CodeX 2019
 */

import config from './config';
import Socket from './modules/socket';
import log from './modules/logger';

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

    log('Hawk says: ' + message, type);
  },

  /**
   * Handles close event from the socket
   */
  close() {
    log(
      'Connection lost. Connection will be restored when new errors occurred',
      'info'
    );
  }
};

/**
 * @typedef {function} HawkCatcherIntegration
 * @param {Object} event - occurred event
 * @param {Object} data - data that will be send to the Hawk Collector
 */

/**
 * @typedef {Object} HawkCatcherSettings
 * @property {string} token - personal token
 * @property {[HawkCatcherIntegration]} integrations - catcher integrations
 * @property {string} host - optional: Hawk collector hostname
 * @property {Number} port - optional: Hawk collector port
 * @property {string} path - Hawk collector route for websocket connection
 * @property {Boolean} secure - pass FALSE to disable secure connection
 */

/**
 * Catcher for events tracking
 * @usage
 * const hawk = new Catcher('token');
 * hawk.test();
 * hawk.handleEvent();
 */
export default class Catcher {
  /**
   * Catcher constructor
   * @param {HawkCatcherSettings|string} settings - settings object or token
   */
  constructor(settings) {
    if (typeof settings === 'string') {
      this.token = settings;
      this.integrations = [];
    } else {
      this.token = settings.token;
      this.integrations = settings.integrations;
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
      log(
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
      message: 'Hawk JavaScript catcher test',
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
      catcherType: 'errors/javascript',
      payload: {
        revision: this.revision || null,
        location: {
          url: window.location.href,
          origin: window.location.origin,
          host: window.location.hostname,
          path: window.location.pathname,
          port: window.location.port
        },
        timestamp: Date.now()
      }
    };

    /**
     * @todo handle self-errors infinity loop & large occurrences
     */

    this.integrations.forEach(int => int(event, data));

    console.log('schaa ', data);
    this.ws.send(data);
  }
}