/**
 * Allows to select only the necessary fields from the error object
 * @param {Object} event - event for filtering
 */
function filterEventFields(event) {
  const necessaryFields = [
    'colno',
    'lineno',
    'filename',
    'message',
    'type',
    'isTrusted',
    'error.message',
    'error.stack'
  ];

  const result = {};

  necessaryFields.forEach(fieldPath => {
    const fields = fieldPath.split('.');
    let eventCache = event;
    let resultCache = result;

    for (let i = 0, length = fields.length; i < length; i++) {
      const fieldName = fields[i];

      if (!eventCache[fieldName]) {
        break;
      }
      eventCache = eventCache[fieldName];
      if (i === length - 1) {
        resultCache[fieldName] = eventCache;
      } else {
        resultCache = resultCache[fieldName] = {};
      }
    }
  });
  return result;
}

module.exports = function (event, data) {
  data.payload.event = filterEventFields(event);
};
