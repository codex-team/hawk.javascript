import type { AffectedUser } from '@hawk.so/types';
import type { HawkStorage } from '../storages/hawk-storage';

/**
 * Storage key used to persist the auto-generated user ID.
 */
export const HAWK_USER_ID_KEY = 'hawk-user-id';

/**
 * Manages the affected user identity.
 *
 * Manually provided users are kept in memory only (they don't change restarts).
 * {@link HawkStorage} is used solely to persist the auto-generated ID
 * so it survives across sessions.
 */
export class HawkUserManager {
  /**
   * In-memory user set explicitly via {@link setUser}.
   */
  private user: AffectedUser | null = null;

  /**
   * Underlying storage used to persist auto-generated user ID.
   */
  private readonly storage: HawkStorage;

  /**
   * @param storage - Storage backend to use for persistence.
   */
  constructor(storage: HawkStorage) {
    this.storage = storage;
  }

  /**
   * Returns the current affected user, or `null` if none is available.
   *
   * Priority: in-memory user > persisted user ID.
   */
  public getUser(): AffectedUser | null {
    if (this.user) {
      return this.user;
    }
    const storedId = this.storage.getItem(HAWK_USER_ID_KEY);
    return storedId ? { id: storedId } : null;
  }

  /**
   * Sets the user explicitly (in memory only).
   *
   * @param user - The affected user provided by the application.
   */
  public setUser(user: AffectedUser): void {
    this.user = user;
  }

  /**
   * Persists an auto-generated user ID to storage.
   *
   * @param id - The generated ID to persist.
   */
  public persistGeneratedId(id: string): void {
    this.storage.setItem(HAWK_USER_ID_KEY, id);
  }

  /**
   * Clears the explicitly set user, falling back to the persisted user ID.
   */
  public clear(): void {
    this.user = null;
  }
}
