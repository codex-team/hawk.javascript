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

        userAgent = detect();

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
            stack: ErrorEvent.error.stack,
            time: Date.now(),
            navigator: userAgent
        };

        ws.send(error);

    };

    /**
     * @using bowser
     *
     * Get info about user browser and platform
     *
     * @returns {{browser: {name: *, version: *, engine, capability}, device: {os, osversion: *, type}, userAgent: string}}
     */
    let detect = function () {

        let bowser = require('./bowser');

        let getRenderingEngine = function () {

            if (bowser.webkit) return 'Webkit';
            if (bowser.blink) return 'Blink';
            if (bowser.gecko) return 'Gecko';
            if (bowser.msie) return 'MS IE';
            if (bowser.msedge) return 'MS Edge';

            return undefined;


        };

        let getOs = function () {

            if (bowser.mac) return 'MacOS';
            if (bowser.windows) return 'Windows';
            if (bowser.windowsphone) return 'Windows Phone';
            if (bowser.linux) return 'Linux';
            if (bowser.chromeos) return 'ChromeOS';
            if (bowser.android) return 'Android';
            if (bowser.ios) return 'iOS';
            if (bowser.firefox) return 'Firefox OS';
            if (bowser.webos) return 'WebOS';
            if (bowser.bada) return 'Bada';
            if (bowser.tizen) return 'Tizen';
            if (bowser.sailfish) return 'Sailfish OS';

            return undefined;

        };

        let getDeviceType = function () {

            if (bowser.tablet) return 'tablet';
            if (bowser.mobile) return 'mobile';

            return 'desktop';

        };

        let getCapability = function () {

            if (bowser.a) return 'full';
            if (bowser.b) return 'degraded';
            if (bowser) return 'minimal';

            return 'browser unknown';

        };

        let browser = {
            name: bowser.name,
            version: bowser.version,
            engine: getRenderingEngine(),
            capability: getCapability()
        };

        let device = {
            os: getOs(),
            osversion: bowser.osversion,
            type: getDeviceType(),
            width: window.innerWidth,
            height: window.innerHeight
        };

        return {
            browser: browser,
            device: device,
            userAgent: window.navigator.userAgent
        };

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