/**
 * @file Integration for adding User Agent info
 */

module.exports = function (event, data) {
  data.payload.userAgent = {
    name: window.navigator.userAgent,
    frame: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  };
};
