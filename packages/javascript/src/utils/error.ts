import Sanitizer from '../modules/sanitizer';

/**
 * Extracts and normalizes error from ErrorEvent or PromiseRejectionEvent
 *
 * @param event - The error or promise rejection event
 */
export function getErrorFromErrorEvent(event: ErrorEvent | PromiseRejectionEvent): Error | string {
  /**
   * Promise rejection reason is recommended to be an Error, but it can be a string:
   * - Promise.reject(new Error('Reason message')) ——— recommended
   * - Promise.reject('Reason message')
   */
  let error = (event as ErrorEvent).error || (event as PromiseRejectionEvent).reason;

  /**
   * Case when error triggered in external script
   * We can't access event error object because of CORS
   * Event message will be 'Script error.'
   */
  if (event instanceof ErrorEvent && error === undefined) {
    error = (event as ErrorEvent).message;
  }

  /**
   * Case when error rejected with an object
   * Using a string instead of wrapping in Error is more natural,
   * it doesn't fake the backtrace, also prefix added for dashboard readability
   */
  if (error instanceof Object && !(error instanceof Error) && event instanceof PromiseRejectionEvent) {
    // Extra sanitize is needed to handle objects with circular references before JSON.stringify
    error = `Promise rejected with ${JSON.stringify(Sanitizer.sanitize(error))}`;
  }

  return Sanitizer.sanitize(error);
}

/**
 * Converts a promise rejection reason to a string message.
 *
 * String(obj) gives "[object Object]" and JSON.stringify("str")
 * adds unwanted quotes.
 *
 * @param reason - The rejection reason from PromiseRejectionEvent
 */
export function stringifyRejectionReason(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message;
  }
  if (typeof reason === 'string') {
    return reason;
  }

  return JSON.stringify(Sanitizer.sanitize(reason));
}
