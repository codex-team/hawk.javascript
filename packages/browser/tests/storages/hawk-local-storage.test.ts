import type { Mock } from 'vitest';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { HawkLocalStorage } from '../../src/storages/hawk-local-storage';

describe('HawkLocalStorage', () => {
  let getItemSpy: Mock<(key: string) => string | null>;
  let setItemSpy: Mock<(key: string, value: string) => void>;
  let removeItemSpy: Mock<(key: string) => void>;
  let storage: HawkLocalStorage;

  beforeEach(() => {
    localStorage.clear();
    storage = new HawkLocalStorage();
    getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return null when key does not exist', () => {
    expect(storage.getItem('foo')).toBeNull();
    expect(getItemSpy).toHaveBeenCalledOnce();
  });

  it('should return value when key exists in storage', () => {
    localStorage.setItem('foo', 'bar');

    expect(storage.getItem('foo')).toEqual('bar');
    expect(getItemSpy).toHaveBeenCalledWith('foo');
  });

  it('should persist item via setItem()', () => {
    storage.setItem('foo', 'bar');

    expect(setItemSpy).toHaveBeenCalledWith('foo', 'bar');
    expect(localStorage.getItem('foo')).toEqual('bar');
  });

  it('should remove item via removeItem()', () => {
    localStorage.setItem('foo', 'bar');
    storage.removeItem('foo');

    expect(removeItemSpy).toHaveBeenCalledWith('foo');
    expect(localStorage.getItem('foo')).toBeNull();
  });

  it('should not affect other keys when removing', () => {
    localStorage.setItem('foo', 'bar');
    storage.removeItem('baz');

    expect(removeItemSpy).toHaveBeenCalledWith('baz');
    expect(localStorage.getItem('foo')).toEqual('bar');
  });

  it('should return null when getItem throws', () => {
    getItemSpy.mockImplementation(() => { throw new Error('SecurityError'); });

    expect(storage.getItem('foo')).toBeNull();
  });

  it('should not throw when setItem throws', () => {
    setItemSpy.mockImplementation(() => { throw new Error('QuotaExceededError'); });

    expect(() => storage.setItem('foo', 'bar')).not.toThrow();
  });

  it('should not throw when removeItem throws', () => {
    removeItemSpy.mockImplementation(() => { throw new Error('SecurityError'); });

    expect(() => storage.removeItem('foo')).not.toThrow();
  });
});
