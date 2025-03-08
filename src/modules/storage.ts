/**
 * Implements Web Storage API if localStorage is not available.
 * So it can be available in node.js environment
 */
class CatcherStorage implements Storage {
  private items: { [key: string]: string } = {};

  /**
   * Returns the value of the item with the specified key.
   *
   * @param key - The key of the item you want to retrieve
   */
  public getItem(key: string): string | null {
    if (this.isLocalStorageAvailable()) {
      return localStorage.getItem(key);
    }

    return this.items[key] || null;
  }

  /**
   * Sets the value of the pair identified by key to value, creating a new key/value pair if none existed for key previously.
   *
   * @param key - The key of the item you want to store
   * @param value - The value of the item you want to store
   */
  public setItem(key: string, value: string): void {
    if (this.isLocalStorageAvailable()) {
      localStorage.setItem(key, value);
    } else {
      this.items[key] = value;
    }
  }

  /**
   * Removes the key/value pair with the given key from the list associated with the object, if a key/value pair with the given key exists.
   *
   * @param key - The key of the item you want to remove
   */
  public removeItem(key: string): void {
    if (this.isLocalStorageAvailable()) {
      localStorage.removeItem(key);
    } else {
      delete this.items[key];
    }
  }

  /**
   * Empties the list associated with the object of all key/value pairs, if there are any.
   */
  public clear(): void {
    if (this.isLocalStorageAvailable()) {
      localStorage.clear();
    } else {
      this.items = {};
    }
  }

  /**
   * Returns the number of key/value pairs currently present in the list associated with the object.
   */
  public get length(): number {
    if (this.isLocalStorageAvailable()) {
      return localStorage.length;
    }

    return Object.keys(this.items).length;
  }

  /**
   * Returns the name of the nth key in the list.
   *
   * @param index - The index of the key you want to get
   */
  public key(index: number): string | null {
    if (this.isLocalStorageAvailable()) {
      return localStorage.key(index);
    }

    return Object.keys(this.items)[index] || null;
  }

  /**
   * Checks if localStorage is available
   */
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
}

export const catcherStorage = new CatcherStorage();
