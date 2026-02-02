import log from './log';
import type { AffectedUser, EventContext } from '@hawk.so/types';
import Sanitizer from '../modules/sanitizer';

/**
 * Validates user data - basic security checks
 *
 * @param user
 */
export function validateUser(user: AffectedUser): boolean {
  if (!user || !Sanitizer.isObject(user)) {
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
 * @param context
 */
export function validateContext(context: EventContext | undefined): boolean {
  if (context && !Sanitizer.isObject(context)) {
    log('validateContext: Context must be an object', 'warn');

    return false;
  }

  return true;
}
