import { HawkStorage } from "@hawk.so/core";

/**
 * {@link HawkStorage} implementation backed by the browser's {@linkcode localStorage}.
 */
export class HawkLocalStorage implements HawkStorage {
  /** @inheritDoc */
  public getItem(key: string): string | null {
    return localStorage.getItem(key);
  }

  /** @inheritDoc */
  public setItem(key: string, value: string): void {
    localStorage.setItem(key, value);
  }

  /** @inheritDoc */
  public removeItem(key: string): void {
    localStorage.removeItem(key);
  }
}
