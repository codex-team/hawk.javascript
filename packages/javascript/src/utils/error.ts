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
  /** Human-readable error message used as a title in the dashboard */
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
 * @param safeError - Sanitized error value (any shape)
 * @returns A non-empty string title, or undefined if the value is nullish or empty
 */
function getTitleFromError(safeError: unknown): string | undefined {
  if (safeError == null) {
    return undefined;
  }

  const message =
    typeof safeError === 'object' && 'message' in safeError ? (safeError as Error).message : safeError;

  if (typeof message === 'string') {
    return message || undefined;
  }

  try {
    return JSON.stringify(message);
  } catch {
    // If no JSON global is available, fall back to string conversion
    return String(message);
  }
}

/**
 * Extracts an error type name from an unknown sanitized error.
 * Returns `.name` only when it is a non-empty string (e.g. 'TypeError').
 *
 * @param safeError - Sanitized error value (any shape)
 * @returns The error name string, or undefined if absent or empty
 */
function getTypeFromError(safeError: unknown): string | undefined {
  const name = (safeError as Error)?.name;

  return name || undefined;
}

/**
 * Constructs a CapturedError from an unknown error value and optional fallbacks.
 *
 * @param error - Any value thrown or rejected
 * @param fallbackValues - Fallback values from event if they can't be extracted from the error
 * @returns A normalized `CapturedError` object
 */
export function fillCapturedError(
  error: unknown,
  fallbackValues: { title?: string; type?: string } = {}
): CapturedError {
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

    return fillCapturedError(event.error, {
      title: event.message && `'${event.message}' at ${event.filename || '<unknown file>'}:${event.lineno}:${event.colno}`,
    });
  }

  if (event.type === 'unhandledrejection') {
    event = event as PromiseRejectionEvent;

    return fillCapturedError(event.reason, {
      type: 'UnhandledRejection',
    });
  }

  return fillCapturedError(undefined);
}
