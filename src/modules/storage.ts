/**
 * Implements Web Storage API if localStorage is not available.
 * So it can be available in node.js environment
 */
class CatcherStorage implements Storage {
  private items: { [key: string]: string } = {};

  private isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  getItem(key: string): string | null {
    if (this.isLocalStorageAvailable()) {
      return localStorage.getItem(key);
    }
    return this.items[key] || null;
  }

  setItem(key: string, value: string): void {
    if (this.isLocalStorageAvailable()) {
      localStorage.setItem(key, value);
    } else {
      this.items[key] = value;
    }
  }

  removeItem(key: string): void {
    if (this.isLocalStorageAvailable()) {
      localStorage.removeItem(key);
    } else {
      delete this.items[key];
    }
  }

  clear(): void {
    if (this.isLocalStorageAvailable()) {
      localStorage.clear();
    } else {
      this.items = {};
    }
  }

  get length(): number {
    if (this.isLocalStorageAvailable()) {
      return localStorage.length;
    }

    return Object.keys(this.items).length;
  }

  key(index: number): string | null {
    if (this.isLocalStorageAvailable()) {
      return localStorage.key(index);
    }
    return Object.keys(this.items)[index] || null;
  }
}

export const catcherStorage = new CatcherStorage();
