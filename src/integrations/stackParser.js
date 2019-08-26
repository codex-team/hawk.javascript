import ErrorStackParser from 'error-stack-parser';

/**
 * Add parsed stack event object
 */
export default function stackParser (event, data) {
  data.payload.event.stack = ErrorStackParser.parse(event.error);
};
