var hawk =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = function () {

    let config = __webpack_require__(1);
    let websocket = __webpack_require__(3);
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

/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = {

    socket: {
        host: 'localhost',
        path: '/log',
        port: 3000
    }

};

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

let hawk = __webpack_require__(0);

hawk.init();

module.exports = hawk;

/***/ }),
/* 3 */
/***/ (function(module, exports) {

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

/***/ })
/******/ ]);
//# sourceMappingURL=hawk.js.map