import { AffectedUser } from "@hawk.so/types";

/**
 * Contract for user identity managers.
 *
 * Implementations are responsible for persisting and retrieving the
 * {@link AffectedUser} that is attached to every error report sent by the catcher.
 */
export interface UserManager {
  /**
   * Returns the current affected user, creating one if none exists yet.
   */
  getUser(): AffectedUser

  /**
   * Replaces the stored user with the provided one.
   *
   * @param user - The affected user to persist.
   */
  setUser(user: AffectedUser): void

  /**
   * Removes any previously stored user data.
   */
  clear(): void
}
