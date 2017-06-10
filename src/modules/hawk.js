module.exports = function () {

    let config = require('../config'),
        websocket = require('./websocket'),
        ws = null,
        userAgent = null,
        token;

    let log = function (message, type) {

        type = type || 'info';

        message = '[Codex Hawk]:  ' + message;

        if ('console' in window && window.console[type]) {

            window.console[type](message);

        }

    };

    let init = function (token_) {

        if (!token_) {
            log('Please, pass your verification token for Hawk error tracker. You can get it on hawk.ifmo.su', 'warn');
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
                message = JSON.parse(data);
                type = data.type;
                message = data.message;
            } catch (e) {
                message = data;
                type = 'info';
            }

            log('Message from server: ' + message.data, 'info');
        },

        close: function () {
            log('Connection lost. Errors won\'t be save. Please, refresh the page', 'warn');
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
            message: ErrorEvent.error.message,
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
            
            return undefined
            
        };
        
        let getDeviceType = function () {
            
            if (bowser.tablet) return 'tablet';
            if (bowser.mobile) return 'mobile';

            return 'desktop'
            
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
        }

    };

    return {
        init: init
    }

}();