import { describe, expect, it, vi } from 'vitest';
import { isValidBreadcrumb, isValidEventPayload, validateContext, validateUser } from '../../src';

// Suppress log output produced by log() calls inside validation failures.
vi.mock('../../src/logger/logger', () => ({ log: vi.fn(), isLoggerSet: vi.fn(() => true), setLogger: vi.fn() }));

describe('validateUser', () => {
  it('should return false when user is null', () => {
    expect(validateUser(null as never)).toBe(false);
  });

  it('should return false when user is a primitive (not an object)', () => {
    expect(validateUser('alice' as never)).toBe(false);
  });

  it('should return false when user has no id property', () => {
    expect(validateUser({} as never)).toBe(false);
  });

  it('should return false when user.id is a whitespace-only string', () => {
    expect(validateUser({ id: '   ' } as never)).toBe(false);
  });

  it('should return false when user.id is not a string', () => {
    expect(validateUser({ id: 42 } as never)).toBe(false);
  });

  it('should return true for a valid user object with an id', () => {
    expect(validateUser({ id: 'user-1' })).toBe(true);
  });
});

describe('validateContext', () => {
  it('should return false when context is a non-object primitive', () => {
    expect(validateContext(42 as never)).toBe(false);
  });

  it('should return false when context is an array', () => {
    expect(validateContext([] as never)).toBe(false);
  });

  it('should return true when context is undefined', () => {
    expect(validateContext(undefined)).toBe(true);
  });

  it('should return true when context is a plain object', () => {
    expect(validateContext({ env: 'production' })).toBe(true);
  });
});

describe('isValidEventPayload', () => {
  it('should return false when payload is not a plain object', () => {
    expect(isValidEventPayload('string')).toBe(false);
  });

  it('should return false when title is missing', () => {
    expect(isValidEventPayload({})).toBe(false);
  });

  it('should return false when title is an empty string', () => {
    expect(isValidEventPayload({ title: '  ' })).toBe(false);
  });

  it('should return false when backtrace is present but not an array', () => {
    expect(isValidEventPayload({ title: 'oops', backtrace: 'not-an-array' })).toBe(false);
  });

  it('should return true when backtrace is an array', () => {
    expect(isValidEventPayload({ title: 'oops', backtrace: [] })).toBe(true);
  });

  it('should return true for a minimal valid payload', () => {
    expect(isValidEventPayload({ title: 'oops' })).toBe(true);
  });
});

describe('isValidBreadcrumb', () => {
  it('should return false when breadcrumb is not a plain object', () => {
    expect(isValidBreadcrumb('not-an-object')).toBe(false);
  });

  it('should return false when message is missing', () => {
    expect(isValidBreadcrumb({})).toBe(false);
  });

  it('should return false when message is a whitespace-only string', () => {
    expect(isValidBreadcrumb({ message: '   ' })).toBe(false);
  });

  it('should return false when timestamp is present but not a number', () => {
    expect(isValidBreadcrumb({ message: 'click', timestamp: 'noon' })).toBe(false);
  });

  it('should return true when timestamp is a valid number', () => {
    expect(isValidBreadcrumb({ message: 'click', timestamp: Date.now() })).toBe(true);
  });

  it('should return true when timestamp is absent', () => {
    expect(isValidBreadcrumb({ message: 'click' })).toBe(true);
  });
});
