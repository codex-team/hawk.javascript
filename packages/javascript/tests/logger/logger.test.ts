import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { createBrowserLogger } from '../../src/logger/logger';

describe('createBrowserLogger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log message with default type', () => {
    const logger = createBrowserLogger('1.0.0');

    logger('Test message');

    expect(consoleLogSpy).toHaveBeenCalledWith(
      '%cHawk (1.0.0)%c Test message',
      expect.stringContaining('background-color'),
      'color: inherit'
    );
  });

  it('should log message with specified type', () => {
    const logger = createBrowserLogger('2.0.0');

    logger('Warning message', 'warn');

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '%cHawk (2.0.0)%c Warning message',
      expect.stringContaining('background-color'),
      'color: inherit'
    );
  });

  it('should log error with args', () => {
    const logger = createBrowserLogger('3.0.0');
    const errorObj = new Error('Test error');

    logger('Error occurred', 'error', errorObj);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '%cHawk (3.0.0)%c Error occurred %o',
      expect.stringContaining('background-color'),
      'color: inherit',
      errorObj
    );
  });

  it('should handle time/timeEnd types', () => {
    const consoleTimeSpy = vi.spyOn(console, 'time').mockImplementation(() => {});
    const logger = createBrowserLogger('4.0.0');

    logger('Timer started', 'time');

    expect(consoleTimeSpy).toHaveBeenCalledWith(
      expect.stringContaining('Hawk (4.0.0)')
    );

    consoleTimeSpy.mockRestore();
  });

  it('should not throw when console method is unavailable', () => {
    const logger = createBrowserLogger('5.0.0');

    expect(() => {
      // @ts-expect-error - testing invalid type
      logger('Test', 'invalidType');
    }).not.toThrow();
  });
});
