import { AffectedUser } from "@hawk.so/types";
import { id } from "../utils/id";
import { HawkStorage } from "./storage";
import { UserManager } from "./user-manager";

/**
 * Storage key used to persist the user identifier.
 */
const HAWK_USER_STORAGE_KEY = 'hawk-user-id';

/**
 * {@link UserManager} implementation that persists the affected user
 * via an injected {@link HawkStorage} backend.
 */
export class StorageUserManager implements UserManager {

  /**
   * Underlying storage used to read and write the user identifier.
   */
  private readonly storage: HawkStorage;

  /**
   * @param storage - Storage backend to use for persistence.
   */
  constructor(storage: HawkStorage) {
    this.storage = storage;
  }

  /**
   * Returns the stored user if one exists. Otherwise, generates a new identifier,
   * saves it in storage under {@linkcode HAWK_USER_STORAGE_KEY}, and returns the new user.
   */
  getUser(): AffectedUser {
    const storedId = this.storage.getItem(HAWK_USER_STORAGE_KEY);
    if (storedId) {
      return {
        id: storedId,
      };
    }

    const userId = id()
    this.storage.setItem(HAWK_USER_STORAGE_KEY, userId);
    return {
      id: userId
    };
  }

  /**
   * Persists the given user's identifier in storage.
   *
   * @param user - The affected user to store.
   */
  setUser(user: AffectedUser): void {
    this.storage.setItem(HAWK_USER_STORAGE_KEY, user.id);
  }

  /**
   * Removes the stored user identifier from storage.
   */
  clear(): void {
    this.storage.removeItem(HAWK_USER_STORAGE_KEY)
  }
}
