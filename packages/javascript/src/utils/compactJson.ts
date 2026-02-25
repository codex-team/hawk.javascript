import type { Json, JsonNode } from '@hawk.so/types';

/**
 * Build a JSON object from key-value pairs.
 * Drops `null`, `undefined`, and empty strings.
 *
 * Useful for compact event payload construction without repetitive `if` chains.
 *
 * @param entries
 */
export function compactJson(entries: [string, JsonNode | null | undefined][]): Json {
  const result: Json = {};

  for (const [key, value] of entries) {
    if (value != null && value !== '') {
      result[key] = value;
    }
  }

  return result;
}
