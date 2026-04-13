import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getErrorFromErrorEvent } from '../../src/utils/error';

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
    it('should capture Error instance with correct fields', () => {
      const error = new Error('Test error');
      const event = new ErrorEvent('error', { error });
      const result = getErrorFromErrorEvent(event);

      expect(result.rawError).toBe(error);
      expect(result.title).toBe('Test error');
      expect(result.type).toBe('Error');
    });

    it('should capture DOMException with correct fields', () => {
      const error = new DOMException('Network error', 'NetworkError');
      const event = new ErrorEvent('error', { error });
      const result = getErrorFromErrorEvent(event);

      expect(result.rawError).toBe(error);
      expect(result.title).toBe('<instance of DOMException>');
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
      expect(result.title).toContain('Script error.');
      expect(result.title).toContain('app.js:10:5');
    });

    it('should return unknown error title when event.error and message are both absent', () => {
      const event = new ErrorEvent('error', { message: '' });
      const result = getErrorFromErrorEvent(event);

      expect(result.title).toBe('<unknown error>');
    });
  });

  describe('PromiseRejectionEvent', () => {
    it('should capture Error reason with correct fields', () => {
      const reason = new Error('Promise rejected');
      const event = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason,
      });
      const result = getErrorFromErrorEvent(event);

      expect(result.rawError).toBe(reason);
      expect(result.title).toBe('Promise rejected');
      expect(result.type).toBe('Error');
    });

    it('should capture string reason', () => {
      const reason = 'Something went wrong';
      const event = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason,
      });
      const result = getErrorFromErrorEvent(event);

      expect(result.rawError).toBe(reason);
      expect(result.title).toBe('Something went wrong');
      expect(result.type).toBe('UnhandledRejection');
    });

    it('should capture plain object reason', () => {
      const reason = { code: 'ERR_001', details: 'Something went wrong' };
      const event = new PromiseRejectionEvent('unhandledrejection', { promise: Promise.resolve(), reason });
      const result = getErrorFromErrorEvent(event);

      expect(result.rawError).toBe(reason);
      expect(result.title).toBe('{"code":"ERR_001","details":"Something went wrong"}');
      expect(result.type).toBe('UnhandledRejection');
    });

    it('should handle undefined reason', () => {
      const event = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason: undefined,
      });
      const result = getErrorFromErrorEvent(event);

      expect(result.rawError).toBeUndefined();
      expect(result.title).toBe('<unknown error>');
    });

    it('should handle null reason', () => {
      const event = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason: null,
      });
      const result = getErrorFromErrorEvent(event);

      expect(result.rawError).toBeNull();
      expect(result.title).toBe('<unknown error>');
    });

    it('should handle circular references in object reason', () => {
      const circularObj: Record<string, unknown> = { name: 'test' };
      circularObj.self = circularObj;
      const event = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason: circularObj,
      });
      const result = getErrorFromErrorEvent(event);

      expect(result.rawError).toBe(circularObj);
      expect(result.title).toContain('<circular>');
    });
  });

  describe('fallback branch', () => {
    it('should return a normalized unknown error for unsupported event types', () => {
      const event = { type: 'custom' } as ErrorEvent | PromiseRejectionEvent;
      const result = getErrorFromErrorEvent(event);

      expect(result.rawError).toBeUndefined();
      expect(result.title).toBe('<unknown error>');
      expect(result.type).toBeUndefined();
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
