import { log } from '../logger/logger';
import type { AffectedUser, Breadcrumb, EventAddons, EventContext, EventData } from '@hawk.so/types';
import { isPlainObject } from './type-guards';

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

  const isBacktraceUndefined = payload.backtrace === undefined;
  const isBacktraceArray = Array.isArray(payload.backtrace);

  return isBacktraceUndefined || isBacktraceArray;
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

  const isTimestampUndefined = breadcrumb.timestamp === undefined;
  const isTimestampNumber = typeof breadcrumb.timestamp === 'number';

  return isTimestampUndefined || isTimestampNumber;
}
