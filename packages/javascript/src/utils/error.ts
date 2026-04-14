import type { HawkJavaScriptEvent } from '@/types';

/**
 * Represents a raw error source before title/type normalization.
 * Fallback values are provided by the event itself when raw error data is missing.
 */
export type ErrorSource = {
  /** The original unsanitized value — use for instanceof checks and backtrace parsing only */
  rawError: unknown;
  /** Fallback human-readable title used when rawError does not provide one */
  fallbackTitle?: string;
  /** Fallback error type provided by the caller */
  fallbackType?: HawkJavaScriptEvent['type'];
};

/**
 * Extracts a human-readable title from an unknown value.
 * Prefers `.message` on objects, falls back to the value itself for strings,
 * and serializes everything else.
 *
 * @param value - Any already-safe value prepared by the caller
 * @returns The error title string, or undefined if absent or empty
 */
export function getTitleFromError(value: unknown): string | undefined {
  if (value == null) {
    return undefined;
  }

  let message: unknown = value;
  if (typeof value === 'object' && 'message' in value) {
    message = (value as {message?: unknown}).message;
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
 * Extracts an error type name from an unknown value.
 *
 * @param value - Any already-safe value prepared by the caller
 * @returns The error name string, or undefined if absent or empty
 */
export function getTypeFromError(value: unknown): HawkJavaScriptEvent['type'] | undefined {
  if (typeof value !== 'object' || value === null || !('name' in value)) {
    return undefined;
  }

  const name = (value as {name?: unknown}).name;

  return typeof name === 'string' && name ? name : undefined;
}

/**
 * Extracts raw error data and event-level fallbacks from ErrorEvent or PromiseRejectionEvent.
 * Handles CORS-restricted errors (where event.error is undefined) by falling back to event.message.
 *
 * @param event - The error or promise rejection event
 * @returns Raw error source with optional event-level fallback values
 */
export function getErrorFromErrorEvent(event: ErrorEvent | PromiseRejectionEvent): ErrorSource {
  if (event.type === 'error') {
    event = event as ErrorEvent;

    return {
      rawError: event.error,
      fallbackTitle: event.message
        ? (event.filename ? `'${event.message}' at ${event.filename}:${event.lineno}:${event.colno}` : event.message)
        : undefined,
    };
  }

  if (event.type === 'unhandledrejection') {
    event = event as PromiseRejectionEvent;

    return {
      rawError: event.reason,
      fallbackType: 'UnhandledRejection',
    };
  }

  return { rawError: undefined };
}
