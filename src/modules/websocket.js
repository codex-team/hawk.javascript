module.exports = function (options) {

    let ws = null;

    let init = function () {

        let protocol = 'ws' + (options.secure ? 's' : '') + '://',
            host = options.host || 'localhost',
            path = options.path ? '/' + options.path : '',
            port = options.port ? ':' + options.port : '',
            url = protocol + host + port + path;


        ws = new WebSocket(url);

    };

    let send = function (data) {

        ws.send(JSON.stringify(data));

    };

    init();

    return {
        send: send,
    }

};