/*!
 * Codex Hawk client side module
 * https://github.com/codex-team/hawk.client
 *
 * Codex Hawk - https://hawk.so
 * Codex Team - https://ifmo.su
 *
 * MIT License | (c) Codex 2017
 */
module.exports = function () {

    'use strict';

    let config = require('../config'),
        websocket = require('./websocket'),
        logger = require('./logger'),
        ws = null,
        userAgent = null,
        token;

    /**
     * Hawk client constructor
     * @param  {string} token_      personal token
     * @param  {string} host        optional: client catcher hostname
     * @param  {Number} port        optional: client catcher port
     * @param  {string} path        hawk catcher route
     * @param  {Boolean} secure     pass FALSE to disable secure connection
     */
    let init = function (token_, host, port, path, secure) {

        config.socket.host = host || config.socket.host;
        config.socket.port = port || config.socket.port;
        config.socket.path = path || config.socket.path;
        config.socket.secure = secure !== undefined ? secure : config.socket.secure;

        if (!token_) {
            logger.log('Please, pass your verification token for Hawk error tracker. You can get it on hawk.so', 'warn');
            return;
        }

        token = token_;

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

            logger.log('Message from server: ' + message, type);
        },

        close: function () {
            logger.log('Connection lost. Errors won\'t be save. Please, refresh the page', 'warn');
        }

    };

    /**
     * Error event handler.
     * Get error params and send to Hawk server
     *
     * @param ErrorEvent
     */
    let errorHandler = function (ErrorEvent) {

        let error = {
            token: token,
            message: ErrorEvent.message,
            error_location: {
                file: ErrorEvent.filename,
                line: ErrorEvent.lineno,
                col: ErrorEvent.colno
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
            navigator: window.navigator.userAgent
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
