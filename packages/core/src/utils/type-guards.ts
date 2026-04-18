/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Checks if value is a plain object (not null, array, Date, Map, etc.)
 *
 * @param value - value to check
 * @returns `true` if value is a plain object, otherwise `false`
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);

  return proto === Object.prototype || proto === null;
}

/**
 * Check if passed variable is an array
 *
 * @param value - variable to check
 * @returns `true` if value is an array, otherwise `false`
 */
export function isArray(value: any): value is any[] {
  return Array.isArray(value);
}

/**
 * Check if passed variable is a not-constructed class
 *
 * @param value - variable to check
 * @returns `true` if value is a class prototype, otherwise `false`
 */
export function isClassPrototype(value: any): boolean {
  if (!value || !value.constructor) {
    return false;
  }

  /**
   * like
   * "function Function {
   *   [native code]
   * }"
   */
  const constructorStr = value.constructor.toString();

  return constructorStr.includes('[native code]') && constructorStr.includes('Function');
}

/**
 * Check if passed variable is a constructed class instance
 *
 * @param value - variable to check
 * @returns `true` if value is a class instance, otherwise `false`
 */
export function isClassInstance(value: any): boolean {
  return !!(value && value.constructor && (/^class \S+ {/).test(value.constructor.toString()));
}

/**
 * Check if passed variable is a string
 *
 * @param value - variable to check
 * @returns `true` if value is a string, otherwise `false`
 */
export function isString(value: any): value is string {
  return typeof value === 'string';
}
