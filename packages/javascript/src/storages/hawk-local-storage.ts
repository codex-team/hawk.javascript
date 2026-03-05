import type { HawkStorage } from '@hawk.so/core';
import log from '../utils/log.ts';

/**
 * {@link HawkStorage} implementation backed by the browser's {@linkcode localStorage}.
 */
export class HawkLocalStorage implements HawkStorage {
  /** @inheritDoc */
  public getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      log('HawkLocalStorage: getItem failed', 'error', e);
      return null;
    }
  }

  /** @inheritDoc */
  public setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      log('HawkLocalStorage: setItem failed', 'error', e);
    }
  }

  /** @inheritDoc */
  public removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      log('HawkLocalStorage: removeItem failed', 'error', e);
    }
  }
}
