import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Sanitizer } from '@hawk.so/core';
import { getErrorFromErrorEvent, getTitleFromError, getTypeFromError } from '../../src/utils/error';

vi.mock('@hawk.so/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hawk.so/core')>();

  return {
    ...actual,
    log: vi.fn(),
    isLoggerSet: vi.fn(() => true),
    setLogger: vi.fn(),
  };
});

describe('getErrorFromErrorEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ErrorEvent', () => {
    it('should capture Error instance raw error without fallbacks', () => {
      const error = new Error('Test error');
      const event = new ErrorEvent('error', { error });
      const result = getErrorFromErrorEvent(event);

      expect(result.rawError).toBe(error);
      expect(result.fallbackTitle).toBeUndefined();
      expect(result.fallbackType).toBeUndefined();
    });

    it('should preserve DOMException instance for downstream normalization', () => {
      const error = new DOMException('Network error', 'NetworkError');
      const event = new ErrorEvent('error', { error });
      const result = getErrorFromErrorEvent(event);

      expect(result.rawError).toBe(error);
      expect(result.fallbackTitle).toBeUndefined();
      expect(result.fallbackType).toBeUndefined();
    });

    it('should fall back to event.message when event.error is not provided', () => {
      const event = new ErrorEvent('error', {
        message: 'Script error.',
        filename: 'app.js',
        lineno: 10,
        colno: 5,
      });
      const result = getErrorFromErrorEvent(event);

      expect(result.rawError).toBeNull();
      expect(result.fallbackTitle).toContain('Script error.');
      expect(result.fallbackTitle).toContain('app.js:10:5');
      expect(result.fallbackType).toBeUndefined();
    });

    it('should omit fallback title when event.error and message are both absent', () => {
      const event = new ErrorEvent('error', { message: '' });
      const result = getErrorFromErrorEvent(event);

      expect(result.rawError).toBeNull();
      expect(result.fallbackTitle).toBeUndefined();
      expect(result.fallbackType).toBeUndefined();
    });
  });

  describe('PromiseRejectionEvent', () => {
    it('should capture Error reason and rejection fallback type', () => {
      const reason = new Error('Promise rejected');
      const event = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason,
      });
      const result = getErrorFromErrorEvent(event);

      expect(result.rawError).toBe(reason);
      expect(result.fallbackTitle).toBeUndefined();
      expect(result.fallbackType).toBe('UnhandledRejection');
    });

    it('should capture string reason', () => {
      const reason = 'Something went wrong';
      const event = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason,
      });
      const result = getErrorFromErrorEvent(event);

      expect(result.rawError).toBe(reason);
      expect(result.fallbackTitle).toBeUndefined();
      expect(result.fallbackType).toBe('UnhandledRejection');
    });

    it('should capture plain object reason', () => {
      const reason = { code: 'ERR_001', details: 'Something went wrong' };
      const event = new PromiseRejectionEvent('unhandledrejection', { promise: Promise.resolve(), reason });
      const result = getErrorFromErrorEvent(event);

      expect(result.rawError).toBe(reason);
      expect(result.fallbackTitle).toBeUndefined();
      expect(result.fallbackType).toBe('UnhandledRejection');
    });

    it('should handle undefined reason', () => {
      const event = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason: undefined,
      });
      const result = getErrorFromErrorEvent(event);

      expect(result.rawError).toBeUndefined();
      expect(result.fallbackTitle).toBeUndefined();
      expect(result.fallbackType).toBe('UnhandledRejection');
    });

    it('should handle null reason', () => {
      const event = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason: null,
      });
      const result = getErrorFromErrorEvent(event);

      expect(result.rawError).toBeNull();
      expect(result.fallbackTitle).toBeUndefined();
      expect(result.fallbackType).toBe('UnhandledRejection');
    });
  });

  describe('fallback branch', () => {
    it('should return an empty error source for unsupported event types', () => {
      const event = { type: 'custom' } as ErrorEvent | PromiseRejectionEvent;
      const result = getErrorFromErrorEvent(event);

      expect(result.rawError).toBeUndefined();
      expect(result.fallbackTitle).toBeUndefined();
      expect(result.fallbackType).toBeUndefined();
    });
  });

  describe('deduplication identity', () => {
    it('rawError should preserve reference to the original object for deduplication', () => {
      const error = new Error('Test');
      const event = new ErrorEvent('error', { error });
      const result1 = getErrorFromErrorEvent(event);
      const result2 = getErrorFromErrorEvent(event);

      expect(result1.rawError).toBe(result2.rawError);
      expect(result1.rawError).toBe(error);
    });
  });
});

describe('getTitleFromError', () => {
  it('should return Error message from sanitized Error', () => {
    const sanitizedError = Sanitizer.sanitize(new Error('Test error'));

    expect(getTitleFromError(sanitizedError)).toBe('Test error');
  });

  it('should return class instance placeholder for sanitized DOMException', () => {
    const sanitizedError = Sanitizer.sanitize(new DOMException('Network error', 'NetworkError'));

    expect(getTitleFromError(sanitizedError)).toBe('<instance of DOMException>');
  });

  it('should serialize sanitized plain objects', () => {
    const sanitizedError = Sanitizer.sanitize({ code: 'ERR_001', details: 'Something went wrong' });

    expect(getTitleFromError(sanitizedError)).toBe('{"code":"ERR_001","details":"Something went wrong"}');
  });

  it('should handle circular references after sanitization', () => {
    const circularObj: Record<string, unknown> = { name: 'test' };
    circularObj.self = circularObj;
    const sanitizedError = Sanitizer.sanitize(circularObj);

    expect(getTitleFromError(sanitizedError)).toContain('<circular>');
  });

  it('should return undefined for nullish values', () => {
    expect(getTitleFromError(undefined)).toBeUndefined();
    expect(getTitleFromError(null)).toBeUndefined();
  });
});

describe('getTypeFromError', () => {
  it('should return Error name from sanitized Error', () => {
    const sanitizedError = Sanitizer.sanitize(new Error('Test error'));

    expect(getTypeFromError(sanitizedError)).toBe('Error');
  });

  it('should return undefined for sanitized strings', () => {
    expect(getTypeFromError(Sanitizer.sanitize('Something went wrong'))).toBeUndefined();
  });

  it('should return undefined when name is absent', () => {
    expect(getTypeFromError(Sanitizer.sanitize({ code: 'ERR_001' }))).toBeUndefined();
  });
});
