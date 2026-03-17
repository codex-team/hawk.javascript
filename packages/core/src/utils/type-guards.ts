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
