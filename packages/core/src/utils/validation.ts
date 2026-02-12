import {AffectedUser, EventContext} from "@hawk.so/types";
import {Logger} from "./log";
import Sanitizer from "../modules/sanitizer";

/**
 * Validates user data - basic security checks
 *
 * @param user - user data to validate
 * @param log - logger function
 */
export function validateUser(
  user: AffectedUser,
  log: Logger,
): boolean {
  if (!user || !Sanitizer.isObject(user)) {
    log('validateUser: User must be an object', 'warn');

    return false;
  }

  // Validate required ID
  if (!user.id || user.id.trim() === '') {
    log('validateUser: User ID is required and must be a non-empty string', 'warn');

    return false;
  }

  return true;
}

/**
 * Validates context data - basic security checks
 *
 * @param context - context data to validate
 * @param log - logger function
 */
export function validateContext(
  context: EventContext | undefined,
  log: Logger,
): boolean {
  if (context && !Sanitizer.isObject(context)) {
    log('validateContext: Context must be an object', 'warn');

    return false;
  }

  return true;
}
