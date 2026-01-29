/**
 * Sensitive keys redaction (aligned with grouper DataFilter).
 * Used in console output and anywhere we must not send secrets to Hawk.
 */

export const SENSITIVE_KEYS = new Set([
  'pan',
  'secret',
  'credentials',
  'card[number]',
  'password',
  'oldpassword',
  'newpassword',
  'auth',
  'access_token',
  'accesstoken',
]);

export const FILTERED_PLACEHOLDER = '[filtered]';

/**
 * Recursively redact values for sensitive keys in objects/arrays.
 */
export function redactSensitiveKeys(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(redactSensitiveKeys);
  }
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    const keyLower = key.toLowerCase();
    result[key] = SENSITIVE_KEYS.has(keyLower) ? FILTERED_PLACEHOLDER : redactSensitiveKeys(val);
  }
  return result;
}
