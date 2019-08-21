/**
 * @file Integration for catching console logs and other info
 */

/**
 * @typedef {Object} ConsoleLogEvent
 * @property {string} method - window.console object method (i.e. log, info, warn)
 * @property {Date} timestamp - time when the log was occurred
 * @property {*} args - log argument
 */

/**
 * @type {[ConsoleLogEvent]} Contains all data that will be logged by window.console
 */
const consoleOutput = [];

// Override console methods
Object.keys(window.console).forEach(key => {
  const oldFunction = window.console[key];

  window.console[key] = function (...args) {
    consoleOutput.push({
      method: key,
      timestamp: new Date(),
      args
    });
    oldFunction.apply(window.console, args);
  };
});

module.exports = function (event, data) {
  data.payload.consoleOutput = consoleOutput;
};
