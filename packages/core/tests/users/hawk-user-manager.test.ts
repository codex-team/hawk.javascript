import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HawkUserManager } from '../../src';
import type { HawkStorage, RandomGenerator } from '../../src';

describe('HawkUserManager', () => {
  let storage: HawkStorage;
  let randomGenerator: RandomGenerator;
  let manager: HawkUserManager;

  beforeEach(() => {
    storage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    randomGenerator = {
      getRandomNumbers: vi.fn().mockReturnValue(new Uint8Array(40).fill(42)),
    };
    manager = new HawkUserManager(storage, randomGenerator);
  });

  it('should return anonymous ID when no user is set and no ID is persisted', () => {
    const user = manager.getUser();

    expect(user.id).toBeTruthy();
    expect(storage.setItem).toHaveBeenCalledWith('hawk-user-id', user.id);
  });

  it('should return in-memory user set via setUser()', () => {
    const user = { id: 'user-1', name: 'Ryan Gosling', url: 'https://example.com', photo: 'https://example.com/photo.png' };

    manager.setUser(user);

    expect(manager.getUser()).toEqual(user);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('should not affect storage when setUser() is called', () => {
    manager.setUser({ id: 'user-1' });

    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it('should return anonymous user from storage when no in-memory user is set', () => {
    vi.mocked(storage.getItem).mockReturnValue('anon-123');

    expect(manager.getUser()).toEqual({ id: 'anon-123' });
    expect(storage.getItem).toHaveBeenCalledWith('hawk-user-id');
  });

  it('should prefer in-memory user over persisted anonymous ID', () => {
    vi.mocked(storage.getItem).mockReturnValue('anon-123');
    manager.setUser({ id: 'explicit-user' });

    expect(manager.getUser()).toEqual({ id: 'explicit-user' });
  });

  it('should clear in-memory user and fall back to persisted anonymous ID', () => {
    vi.mocked(storage.getItem).mockReturnValue('anon-123');
    manager.setUser({ id: 'user-1' });
    manager.clear();

    expect(manager.getUser()).toEqual({ id: 'anon-123' });
  });

  it('should return new anonymous ID after clear() when no ID is persisted', () => {
    manager.setUser({ id: 'user-1' });
    manager.clear();

    const user = manager.getUser();

    expect(user.id).toBeTruthy();
    expect(storage.setItem).toHaveBeenCalledWith('hawk-user-id', user.id);
  });
});
