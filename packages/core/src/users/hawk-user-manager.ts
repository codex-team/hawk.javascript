import type { AffectedUser } from '@hawk.so/types';
import type { HawkStorage } from '../storages/hawk-storage';
import { id } from '../utils/id';
import type { RandomGenerator } from '../utils/random';

/**
 * Storage key used to persist the auto-generated user ID.
 */
const HAWK_USER_ID_KEY = 'hawk-user-id';

/**
 * Manages the affected user identity.
 *
 * Manually provided users are kept in memory only (they don't change restarts).
 * {@link HawkStorage} is used solely to persist the auto-generated ID
 * so it survives across sessions.
 *
 * @remarks changes to user data in storage from outside manager are not tracked;
 * for changes to take effect call {@link clear}.
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
   * Random generator used to produce anonymous user IDs.
   */
  private readonly randomGenerator: RandomGenerator;

  /**
   * @param storage - storage backend to use for persistence
   * @param randomGenerator - utilities related to RandomGenerator generated values
   */
  constructor(
    storage: HawkStorage,
    randomGenerator: RandomGenerator
  ) {
    this.storage = storage;
    this.randomGenerator = randomGenerator;
  }

  /**
   * Returns current affected user if set, otherwise generates and persists an anonymous ID.
   *
   * Priority: in-memory user > persisted user ID.
   *
   * @returns set affected user or user with generated ID
   */
  public getUser(): AffectedUser {
    if (this.user) {
      return this.user;
    }

    let storedId = this.storage.getItem(HAWK_USER_ID_KEY);

    if (!storedId) {
      storedId = id(this.randomGenerator);
      this.storage.setItem(HAWK_USER_ID_KEY, storedId);
    }

    this.user = { id: storedId };

    return this.user!;
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
   * Clears the explicitly set user, falling back to the persisted user ID.
   */
  public clear(): void {
    this.user = null;
  }
}
