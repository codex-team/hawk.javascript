import log from './log';

/**
 * Symbol to mark error as processed by Hawk
 */
const errorSentShadowProperty = Symbol('__hawk_processed__');

/**
 * Check if the error has alrady been sent to Hawk.
 *
 * Motivation:
 * Some integrations may catch errors on their own side and then normally re-throw them down.
 * In this case, Hawk will catch the error again.
 * We need to prevent this from happening.
 *
 * @param error - error object
 */
export function isErrorProcessed(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  return error[errorSentShadowProperty] === true;
}

/**
 * Add non-enumerable property to the error object to mark it as processed.
 *
 * @param error - error object
 */
export function markErrorAsProcessed(error: unknown): void {
  try {
    if (typeof error !== 'object' || error === null) {
      return;
    }

    Object.defineProperty(error, errorSentShadowProperty, {
      enumerable: false, // Prevent from beight collected by Hawk
      value: true,
      writable: true,
      configurable: true,
    });
  } catch (e) {
    log('Failed to mark error as processed', 'error', e);
  }
}
