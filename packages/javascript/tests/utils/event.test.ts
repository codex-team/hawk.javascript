import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getErrorFromEvent } from '../../src/utils/event';

vi.mock('@hawk.so/core', () => ({ log: vi.fn(), isLoggerSet: vi.fn(() => true), setLogger: vi.fn() }));

import Sanitizer from '../../src/modules/sanitizer';

describe('getErrorFromEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ErrorEvent', () => {
    it('should return the Error when event.error is an Error instance', () => {
      const error = new Error('Test error');
      const event = new ErrorEvent('error', { error });

      const result = getErrorFromEvent(event);

      expect(result).toBe(error);
    });

    it('should return the DOMException when event.error is a DOMException', () => {
      const error = new DOMException('Network error', 'NetworkError');
      const event = new ErrorEvent('error', { error });

      const result = getErrorFromEvent(event);

      expect(result).toBe('<instance of DOMException>');
    });

    it('should return the message when event.error is not provided and message is a string', () => {
      const event = new ErrorEvent('error', { message: 'Script error.' });

      const result = getErrorFromEvent(event);

      expect(result).toBe('Script error.');
    });

    it('should return empty string when event.error is not provided and message is empty', () => {
      const event = new ErrorEvent('error', { message: '' });

      const result = getErrorFromEvent(event);

      expect(result).toBe('');
    });
  });

  describe('PromiseRejectionEvent', () => {
    it('should return the Error when event.reason is an Error instance', () => {
      const reason = new Error('Promise rejected');
      const event = new PromiseRejectionEvent('unhandledrejection', { promise: Promise.resolve(), reason });

      const result = getErrorFromEvent(event);

      expect(result).toBe(reason);
    });

    it('should return the string when event.reason is a string', () => {
      const reason = 'Promise rejected with string';
      const event = new PromiseRejectionEvent('unhandledrejection', { promise: Promise.resolve(), reason });

      const result = getErrorFromEvent(event);

      expect(result).toBe(reason);
    });

    it('should return stringified object when event.reason is a plain object', () => {
      const reason = { code: 'ERR_001', details: 'Something went wrong' };
      const event = new PromiseRejectionEvent('unhandledrejection', { promise: Promise.resolve(), reason });

      const result = getErrorFromEvent(event);

      expect(result).toBe('Promise rejected with {"code":"ERR_001","details":"Something went wrong"}');
    });

    it('should return undefined when event.reason is not provided', () => {
      const event = new PromiseRejectionEvent('unhandledrejection', { promise: Promise.resolve(), reason: undefined });

      const result = getErrorFromEvent(event);

      expect(result).toBeUndefined();
    });

    it('should return null when event.reason is null', () => {
      const event = new PromiseRejectionEvent('unhandledrejection', { promise: Promise.resolve(), reason: null });

      const result = getErrorFromEvent(event);

      expect(result).toBeNull();
    });

    it('should handle circular references in object reason', () => {
      const circularObj: Record<string, unknown> = { name: 'test' };
      circularObj.self = circularObj;

      const event = new PromiseRejectionEvent('unhandledrejection', { promise: Promise.resolve(), reason: circularObj });

      const result = getErrorFromEvent(event);

      expect(result).toContain('Promise rejected with');
      expect(result).toContain('<circular>');
    });
  });
});
