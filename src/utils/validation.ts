import type { AffectedUser, EventContext } from '@hawk.so/types';

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
 */
export function validateUser(user: any): ValidationResult<AffectedUser> {
  const errors: string[] = [];

  if (!user || typeof user !== 'object') {
    errors.push('User must be an object');
    return { isValid: false, errors };
  }

  // Validate required ID
  if (!user.id || typeof user.id !== 'string' || user.id.trim() === '') {
    errors.push('User ID is required and must be a non-empty string');
    return { isValid: false, errors };
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
 */
export function validateContext(context: any): ValidationResult<EventContext> {
  const errors: string[] = [];

  if (!context || typeof context !== 'object') {
    errors.push('Context must be an object');
    return { isValid: false, errors };
  }

  const validatedContext: EventContext = {};

  for (const [key, value] of Object.entries(context)) {
    // Basic key validation
    if (typeof key !== 'string' || key.trim() === '') {
      continue;
    }

    // Check if value is serializable (prevents injection)
    try {
      JSON.stringify(value);
    } catch (e) {
      continue; // Skip non-serializable values
    }

    validatedContext[key.trim()] = value as any;
  }

  return {
    isValid: true,
    data: validatedContext,
    errors,
  };
}

/**
 * Logs validation errors
 */
export function logValidationErrors(prefix: string, errors: string[]): void {
  errors.forEach((error) => {
    console.warn(`${prefix}: ${error}`);
  });
}
