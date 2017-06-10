module.exports = function () {

    let config = require('../config');
    let websocket = require('./websocket');
    let ws = null;

    let init = function () {

        ws = websocket(config.socket);

        window.addEventListener('error', errorHandler);

    };

    let errorHandler = function (ErrorEvent) {

        let error = {
            message: ErrorEvent.error.message,
            location: {
                file: ErrorEvent.filename,
                line: ErrorEvent.lineno,
                col: ErrorEvent.colno
            },
            stack: ErrorEvent.error.stack,
            time: Date.now()
        };

        ws.send(error);

    };

    return {
        init: init
    }

}();