import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Each test gets a fresh module instance via vi.resetModules() so that
 * the module-level loggerInstance starts as null.
 */
describe('Logger', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should return false from isLoggerSet when no logger has been registered', async () => {
    const { isLoggerSet } = await import('../../src/logger/logger');

    expect(isLoggerSet()).toBe(false);
  });

  it('should return true from isLoggerSet after setLogger is called', async () => {
    const { isLoggerSet, setLogger } = await import('../../src/logger/logger');

    setLogger(vi.fn());

    expect(isLoggerSet()).toBe(true);
  });

  it('should not throw when log is called with no logger registered', async () => {
    const { log } = await import('../../src/logger/logger');

    expect(() => log('test message')).not.toThrow();
  });

  it('should forward msg, type, and args to the registered logger', async () => {
    const { setLogger, log } = await import('../../src/logger/logger');
    const mockLogger = vi.fn();

    setLogger(mockLogger);
    log('something went wrong', 'warn', { code: 42 });

    expect(mockLogger).toHaveBeenCalledOnce();
    expect(mockLogger).toHaveBeenCalledWith('something went wrong', 'warn', { code: 42 });
  });

  it('should pass undefined for omitted type and args', async () => {
    const { setLogger, log } = await import('../../src/logger/logger');
    const mockLogger = vi.fn();

    setLogger(mockLogger);
    log('simple');

    expect(mockLogger).toHaveBeenCalledWith('simple', undefined, undefined);
  });

  it('should replace a previously registered logger when setLogger is called again', async () => {
    const { setLogger, log } = await import('../../src/logger/logger');
    const first = vi.fn();
    const second = vi.fn();

    setLogger(first);
    setLogger(second);
    log('msg');

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('msg', undefined, undefined);
  });

  it('should clear the registered logger when resetLogger is called', async () => {
    const { isLoggerSet, setLogger, resetLogger } = await import('../../src/logger/logger');

    setLogger(vi.fn());
    expect(isLoggerSet()).toBe(true);

    resetLogger();
    expect(isLoggerSet()).toBe(false);
  });

  it('should become a no-op after resetLogger is called', async () => {
    const { setLogger, resetLogger, log } = await import('../../src/logger/logger');
    const mockLogger = vi.fn();

    setLogger(mockLogger);
    resetLogger();
    log('msg');

    expect(mockLogger).not.toHaveBeenCalled();
  });
});
