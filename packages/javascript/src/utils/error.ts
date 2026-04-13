import type { HawkJavaScriptEvent } from '@/types';
import { Sanitizer } from '@hawk.so/core';

/**
 * Represents a captured error in a normalized form.
 *
 * Motivation:
 * - `Error | string` is unclear and hard to work with.
 * - Fields can be filled from an event or from the error itself.
 */
export type CapturedError = {
  /** Human-readable non-empty error message used as a title in the dashboard */
  title: string;
  /** Error type (e.g. 'TypeError', 'NetworkError'), or undefined if unknown */
  type: HawkJavaScriptEvent['type'];
  /** The original (unsanitized) value — use for instanceof checks and backtrace parsing only */
  rawError: unknown;
};

/**
 * Extracts a human-readable title from an unknown sanitized error.
 * Prefers `.message` on objects, falls back to the value itself for strings,
 * and serializes everything else.
 *
 * @param sanitizedError - Value returned by `Sanitizer.sanitize(error)`
 * @returns The error title string, or undefined if absent or empty
 */
function getTitleFromError(sanitizedError: unknown): string | undefined {
  if (sanitizedError == null) {
    return undefined;
  }

  let message: unknown = sanitizedError;
  if (typeof sanitizedError === 'object' && 'message' in sanitizedError) {
    message = (sanitizedError as {message: unknown}).message;
  }

  if (typeof message === 'string') {
    return message || undefined;
  }

  try {
    return JSON.stringify(message);
  } catch {
    /**
     * If no JSON global is available or serialization fails,
     * fall back to string conversion
     */
    return String(message);
  }
}

/**
 * Extracts an error type name from an unknown sanitized error.
 *
 * @param sanitizedError - Value returned by `Sanitizer.sanitize(error)`
 * @returns The error name string, or undefined if absent or empty
 */
function getTypeFromError(sanitizedError: unknown): string | undefined {
  return (sanitizedError as {name: string})?.name || undefined;
}

/**
 * Constructs a CapturedError from an unknown error value and optional fallbacks.
 * The thrown value is first passed through `Sanitizer.sanitize(error)`.
 *
 * @param error - Any value thrown or rejected
 * @param fallbackValues - Fallback values from event if they can't be extracted from the error
 * @returns A normalized `CapturedError` object
 */
export function composeCapturedError(
  error: unknown,
  fallbackValues: { title?: string; type?: string } = {}
): CapturedError {
  /**
   * @todo we should consider moving Sanitizer to utils
  */
  const sanitizedError = Sanitizer.sanitize(error);

  return {
    title: getTitleFromError(sanitizedError) || fallbackValues.title || '<unknown error>',
    type: getTypeFromError(sanitizedError) || fallbackValues.type,
    rawError: error,
  };
}

/**
 * Extracts and normalizes error from ErrorEvent or PromiseRejectionEvent.
 * Handles CORS-restricted errors (where event.error is undefined) by falling back to event.message.
 *
 * @param event - The error or promise rejection event
 * @returns A normalized CapturedError object
 */
export function getErrorFromErrorEvent(event: ErrorEvent | PromiseRejectionEvent): CapturedError {
  if (event.type === 'error') {
    event = event as ErrorEvent;

    return composeCapturedError(event.error, {
      title: event.message && (event.filename ? `'${event.message}' at ${event.filename}:${event.lineno}:${event.colno}` : event.message),
    });
  }

  if (event.type === 'unhandledrejection') {
    event = event as PromiseRejectionEvent;

    return composeCapturedError(event.reason, {
      type: 'UnhandledRejection',
    });
  }

  /*
  Fallback case: ensures function always returns CapturedError.
  composeCapturedError(undefined) yields object with undefined fields.
  */
  return composeCapturedError(undefined);
}
