const consoleOutput = [];

Object.keys(window.console).forEach(key => {
  const oldFunction = window.console[key];

  window.console[key] = function (...args) {
    consoleOutput.push({
      method: key,
      args
    });
    oldFunction.apply(window.console, args);
  };
});

module.exports = function (event, data) {
  data.payload.consoleOutput = consoleOutput;
};
