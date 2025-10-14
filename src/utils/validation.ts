import type { AffectedUser, EventContext } from '@hawk.so/types';
import Sanitizer from '../modules/sanitizer';

/**
 * Validation result interface
 */
interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors: string[];
}

/**
 * Validates user data - basic security checks
 *
 * @param user
 */
export function validateUser(user: AffectedUser): ValidationResult<AffectedUser> {
  const errors: string[] = [];

  if (!user || !Sanitizer.isObject(user)) {
    errors.push('User must be an object');

    return { isValid: false,
      errors };
  }

  // Validate required ID
  if (!user.id || typeof user.id !== 'string' || user.id.trim() === '') {
    errors.push('User ID is required and must be a non-empty string');

    return { isValid: false,
      errors };
  }

  const validatedUser: AffectedUser = {
    id: user.id.trim(),
  };

  // Add optional fields if they exist and are strings
  if (user.name && typeof user.name === 'string') {
    validatedUser.name = user.name.trim();
  }

  if (user.url && typeof user.url === 'string') {
    validatedUser.url = user.url.trim();
  }

  if (user.image && typeof user.image === 'string') {
    validatedUser.image = user.image.trim();
  }

  return {
    isValid: true,
    data: validatedUser,
    errors,
  };
}

/**
 * Validates context data - basic security checks
 *
 * @param context
 */
export function validateContext(context: EventContext): ValidationResult<EventContext> {
  const errors: string[] = [];

  if (!context || !Sanitizer.isObject(context)) {
    errors.push('Context must be an object');

    return { isValid: false,
      errors };
  }

  return {
    isValid: true,
    data: context,
    errors,
  };
}

/**
 * Logs validation errors
 *
 * @param prefix
 * @param errors
 */
export function logValidationErrors(prefix: string, errors: string[]): void {
  errors.forEach((error) => {
    console.warn(`${prefix}: ${error}`);
  });
}
