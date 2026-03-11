import { log } from '@hawk.so/core';
import Sanitizer from '../modules/sanitizer';

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

/**
 * Extracts and normalizes error from ErrorEvent or PromiseRejectionEvent
 *
 * @param event - The error or promise rejection event
 */
export function getErrorFromEvent(event: ErrorEvent | PromiseRejectionEvent): Error | string {
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
