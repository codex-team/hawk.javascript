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
 * @property {Function} onopen - fires when connection have been opened
 * @property {Function} onmessage - fires when message from server received
 * @property {Function} onclose - fires when connection have been closed
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
    this.onclose = options.onclose;
    this.onopen = options.onopen;
    this.onmessage = options.onmessage;

    this.eventsQueue = [];
    this.ws = null;
    this.init();
  }

  init() {
    return new Promise( (resolve, reject) => {
      this.ws = new WebSocket(this.url);

      if (typeof this.onmessage === 'function') {
        this.ws.onmessage = this.onmessage;
      }

      this.ws.onclose = () => this.eventsQueue.length && this.reconnect();

      this.ws.onopen = (e) => {
        resolve(e);
        this.eventsQueue.forEach(event => this.send(event));
      };
    });
  }

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
