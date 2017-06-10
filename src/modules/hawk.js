module.exports = function () {

    let config = require('../config'),
        websocket = require('./websocket'),
        ws = null,
        userAgent = null;

    let init = function () {

        ws = websocket(config.socket);

        userAgent = detect();

        window.addEventListener('error', errorHandler);

    };

    /**
     * Error event handler.
     * Get error params and send to Hawk server
     *
     * @param ErrorEvent
     */
    let errorHandler = function (ErrorEvent) {

        let error = {
            message: ErrorEvent.error.message,
            location: {
                file: ErrorEvent.filename,
                line: ErrorEvent.lineno,
                col: ErrorEvent.colno
            },
            stack: ErrorEvent.error.stack,
            time: Date.now(),
            navigator: userAgent
        };

        console.log(error);

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
            type: getDeviceType()
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