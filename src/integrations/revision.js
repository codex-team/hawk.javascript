/**
 * @file Integration for adding application revision number
 */

module.exports = function (revision) {
  return function (event, data) {
    data.payload.revision = revision;
  };
};
