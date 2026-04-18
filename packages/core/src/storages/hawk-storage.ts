/**
 * Abstract key–value storage contract used by Hawk internals to persist data across sessions.
 */
export interface HawkStorage {
  /**
   * Returns the value associated with the given key, or `null` if none exists or on error.
   *
   * @param key - Storage key to look up.
   */
  getItem(key: string): string | null;

  /**
   * Persists a value under the given key. Must not throw on failure.
   *
   * @param key - Storage key.
   * @param value - Value to store.
   */
  setItem(key: string, value: string): void;

  /**
   * Removes the entry for the given key. Must not throw on failure.
   *
   * @param key - Storage key to remove.
   */
  removeItem(key: string): void;
}
