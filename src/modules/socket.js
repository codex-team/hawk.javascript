const logger = require('./logger');

/**
 * @typedef {Object} SocketOptions
 *
 * Server properties
 * @property {String} host - WebSocket server host
 * @property {String} path - WebSocket server path
 * @property {Number} port - WebSocket server port
 * @property {Boolean} secure - if True, uses wss protocol, else ws
 *
 * Events handlers
 * @property {Function} onmessage - fires when message from server received
 * @property {Function} onopen - fires when connection have been opened
 * @property {Function} onclose - fires when connection have been closed
 */

/**
 * Custom WebSocket wrapper class
 */
class Socket {
  /**
   * Creates new Socket instance. Setup initial socket params.
   * @param {SocketOptions} options - parameters for establishing a connection with server
   */
  constructor(options) {
    const protocol = 'ws' + (options.secure ? 's' : '') + '://';
    const host = options.host || 'localhost';
    const path = options.path ? '/' + options.path : '';
    const port = options.port ? ':' + options.port : '';

    this.url = protocol + host + port + path;
    this.onmessage = options.onmessage;
    this.onclose = options.onclose;
    this.onopen = options.onopen;

    this.eventsQueue = [];
    this.ws = null;
    this.init().catch((e) => {
      console.log(e);
    });
  }

  /**
   * Create new websocket connection and setup event listeners
   * @return {Promise<void>}
   */
  init() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      if (typeof this.onmessage === 'function') {
        this.ws.onmessage = this.onmessage;
      }

      this.ws.onclose = () => {
        if (typeof this.onclose === 'function') {
          this.onclose();
        }
      };

      this.ws.onerror = (e) => {
        reject(e);
      };

      this.ws.onopen = () => {
        if (typeof this.onopen === 'function') {
          this.onopen();
        }
        resolve();
        while (this.eventsQueue.length) {
          this.send(this.eventsQueue.shift());
        }
      };
    });
  }

  /**
   * Tries to reconnect to the server a specified number of times
   * @param {Number} attempts - how many attempts will be made to connect
   * @param flag
   * @return {Promise<void>}
   */
  async reconnect(attempts, flag = false) {
    if (!attempts) {
      this.reconnectionInterval = null;
      return;
    }
    if (attempts && this.reconnectionInterval && !flag) return;

    this.reconnectionInterval = null;
    try {
      await this.init();
      logger.log('Successfully reconnect to socket server', 'info');
    } catch (e) {
      this.reconnectionInterval = setTimeout(() => this.reconnect(attempts - 1, true), 1000 * 5);
    }
  }

  /**
   * Send data to the server
   * @param {Object} data - data to send
   * @return {Promise<*>}
   */
  async send(data) {
    if (this.ws === null) {
      this.eventsQueue.push(data);
      return this.init();
    }

    switch (this.ws.readyState) {
      case WebSocket.OPEN:
        data = JSON.stringify(data);
        return this.ws.send(data);
      case WebSocket.CLOSED:
        this.eventsQueue.push(data);
        return this.reconnect(2);
      case WebSocket.CONNECTING:
      case WebSocket.CLOSING:
        return this.eventsQueue.push(data);
    }
  }
}

module.exports = Socket;
