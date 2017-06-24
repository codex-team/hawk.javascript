module.exports = function (options) {

    let ws = null,
        logger = require('./logger');

    const STATES = {
        CONNECTING: 0,
        OPEN: 1,
        CLOSING: 2,
        CLOSED: 3
    };

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

    let reconnect = function (attempts=1) {

        return new Promise(function (resolve, reject) {

            init()
              .then(function () {

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