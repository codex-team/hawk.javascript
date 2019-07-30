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

    this.eventsQueue = [];
    this.ws = null;
    this.init();
  }

  /**
   * Create new websocket connection and setup event listeners
   * @return {Promise<void>}
   */
  init() {
    return new Promise( (resolve, reject) => {
      this.ws = new WebSocket(this.url);

      if (typeof this.onmessage === 'function') {
        this.ws.onmessage = this.onmessage;
      }

      this.ws.onclose = () => this.eventsQueue.length && this.reconnect();

      this.ws.onopen = () => {
        resolve();
        this.eventsQueue.forEach(event => this.send(event));
      };
    });
  }

  /**
   * Tries to reconnect to the server a specified number of times
   * @param {Number} attempts - how many attempts will be made to connect
   * @return {Promise<void>}
   */
  async reconnect(attempts = 2) {
    try {
      await this.init();
      logger.log('Successfully reconnect to socket server', 'info');
    } catch (e) {
      if (attempts > 0) {
        await this.reconnect(attempts - 1);
      } else {
        logger.log('Can\'t reconnect to socket server', 'warn');
      }
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
      case WebSocket.CONNECTING:
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return this.eventsQueue.push(data);
    }
  }
}

module.exports = Socket;
