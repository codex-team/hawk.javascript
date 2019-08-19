module.exports = function (revision) {
  return function (event, data) {
    data.payload.revision = revision;
  };
};
