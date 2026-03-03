import { log } from '../logger/logger';
import type { AffectedUser, Breadcrumb, EventAddons, EventContext, EventData } from '@hawk.so/types';

/**
 * Validates user data - basic security checks
 *
 * @param user - user data to validate
 */
export function validateUser(user: AffectedUser): boolean {
  if (!user || !isPlainObject(user)) {
    log('validateUser: User must be an object', 'warn');

    return false;
  }

  // Validate required ID
  if (!user.id || typeof user.id !== 'string' || user.id.trim() === '') {
    log('validateUser: User ID is required and must be a non-empty string', 'warn');

    return false;
  }

  return true;
}

/**
 * Validates context data - basic security checks
 *
 * @param context - context data to validate
 */
export function validateContext(context: EventContext | undefined): boolean {
  if (context && !isPlainObject(context)) {
    log('validateContext: Context must be an object', 'warn');

    return false;
  }

  return true;
}

/**
 * Checks if value is a plain object (not null, array, Date, Map, etc.)
 *
 * @param value - value to check
 * @returns `true` if value is a plain object, otherwise `false`
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

/**
 * Runtime check for required EventData fields.
 * Per @hawk.so/types EventData, `title` is the only non-optional field.
 * Additionally, validates `backtrace` shape if present (must be an array).
 *
 * @param payload - value to validate
 */
export function isValidEventPayload(payload: unknown): payload is EventData<EventAddons> {
  if (!isPlainObject(payload)) {
    return false;
  }

  if (typeof payload.title !== 'string' || payload.title.trim() === '') {
    return false;
  }

  return !(payload.backtrace !== undefined && !Array.isArray(payload.backtrace));
}

/**
 * Runtime check that value is a valid Breadcrumb-like object.
 * Must be a plain object with a string message and numeric timestamp.
 *
 * @param breadcrumb - value to validate
 */
export function isValidBreadcrumb(breadcrumb: unknown): breadcrumb is Breadcrumb {
  if (!isPlainObject(breadcrumb)) {
    return false;
  }

  if (typeof breadcrumb.message !== 'string' || breadcrumb.message.trim() === '') {
    return false;
  }

  return !(breadcrumb.timestamp !== undefined && typeof breadcrumb.timestamp !== 'number');
}
