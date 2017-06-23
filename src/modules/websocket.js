module.exports = function (options) {

    console.log("options: %o", options);

    let ws = null;

    let init = function () {

        let protocol = 'ws' + (options.secure ? 's' : '') + '://',
            host = options.host || 'localhost',
            path = options.path ? '/' + options.path : '',
            port = options.port ? ':' + options.port : '',
            url = protocol + host + port + path;

        console.log("protocol: %o", protocol);

        console.log("url: %o", url);


        ws = new WebSocket(url);

        if (typeof options.onmessage == 'function') {
            ws.onmessage = options.onmessage;
        }

        if (typeof options.onclose == 'function') {
            ws.onclose = options.onclose;
        }

        if (typeof options.onopen == 'function') {
            ws.onopen = options.onopen;
        }

    };

    let send = function (data) {

        ws.send(JSON.stringify(data));

    };

    init();

    return {
        send: send,
    }

};