/**
 * Native websocket module
 * Open new websocket connection using native WebSocket object
 *
 * @usage
 * var ws = new websocket({
 *  host: 'localhost',
 *  path: 'socket',
 *  port: 80000,
 *  onmessage: messageHandler
 * })
 *
 * @param {Object} options
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
 *
 * @returns {{send: send}}
 */
module.exports = function (options) {

    let ws = null,
        logger = require('./logger');

    const STATES = {
        CONNECTING: 0,
        OPEN: 1,
        CLOSING: 2,
        CLOSED: 3
    };

  /**
   * Open new websocket connection
   * Returns promise, resolved if connection was opened and rejected on error
   *
   * @returns {Promise}
   */
  let init = function () {

        return new Promise(function (resolve, reject) {

            let protocol = 'ws' + (options.secure ? 's' : '') + '://',
                host = options.host || 'localhost',
                path = options.path ? '/' + options.path : '',
                port = options.port ? ':' + options.port : '',
                url = protocol + host + port + path;

            ws = new WebSocket(url);

            if (typeof options.onmessage === 'function') {

                ws.onmessage = options.onmessage;

            }

            ws.onclose = function (e) {

                if (typeof options.onclose === 'function') {

                    options.onclose.call(this, e);

                }

                reject();

            }

            ws.onopen = function (e) {

                if (typeof options.onopen === 'function') {

                  options.onopen.call(this, e);

                }

                resolve();

            }

        });

    };

  /**
   * Try to open new websocket connection.
   * Returns promise, resolved if reconnect was successful, rejected otherwise
   *
   * @param attempts - number of reconnect attempts. 1 by default
   * @returns {Promise}
   */
    let reconnect = function (attempts=1) {

        return new Promise(function (resolve, reject) {

            init()
              .then(function () {

                  logger.log('Successfully reconnect to socket server', 'info');
                  resolve();

              },
              function () {

                  if (attempts > 0) {

                      reconnect(attempts - 1)
                        .then(resolve, reject);

                  } else {

                      logger.log('Can\'t reconnect to socket server', 'warn');
                      reject();

                  }

              })
              .catch(function (e) {

                  logger.log('Error while reconnecting to socket server', 'error');

              });

        });


    };

  /**
   * Send data to WebSocket server in JSON format
   * @param data
   */
  let send = function (data) {

        if (ws === null) {
            return;
        }

        data = JSON.stringify(data);

        if (ws.readyState !== STATES.OPEN) {

            reconnect()
              .then(function () {

                  ws.send(data);

              },
              function () {

                  logger.log('Can\'t send your data', 'warn');

              });

        } else {

            ws.send(data);

        }

    };

    init()
      .catch(function (e) {

          logger.log('Error while openning socket connection', 'error');

      });

    return {
        send: send,
    };

};