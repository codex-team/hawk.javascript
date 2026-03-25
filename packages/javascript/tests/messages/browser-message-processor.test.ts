import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserMessageProcessor } from '../../src/messages/browser-message-processor';
import { makePayload } from './message-processor.helpers';

describe('BrowserMessageProcessor', () => {
  beforeEach(() => {
    vi.stubGlobal('location', { href: 'http://localhost/', search: '' });
    vi.stubGlobal('navigator', { userAgent: 'test-agent' });
    vi.stubGlobal('innerWidth', 1280);
    vi.stubGlobal('innerHeight', 720);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should set window dimensions, userAgent, and url', () => {
    const result = new BrowserMessageProcessor().apply(makePayload());

    expect(result?.addons).toMatchObject({
      window: { innerWidth: 1280, innerHeight: 720 },
      userAgent: 'test-agent',
      url: 'http://localhost/',
    });
  });

  it('should parse GET parameters from the URL', () => {
    vi.stubGlobal('location', { href: 'http://localhost/?foo=bar&baz=qux', search: '?foo=bar&baz=qux' });

    const result = new BrowserMessageProcessor().apply(makePayload());

    expect(result?.addons?.get).toEqual({ foo: 'bar', baz: 'qux' });
  });

  it('should omit get when URL has no query string', () => {
    const result = new BrowserMessageProcessor().apply(makePayload());

    expect(result?.addons?.get).toBeUndefined();
  });

  it('should merge with existing payload addons', () => {
    const payload = makePayload({ addons: { consoleOutput: [{ message: 'log' }] } as any });
    const result = new BrowserMessageProcessor().apply(payload);

    expect(result?.addons?.consoleOutput).toBeDefined();
    expect(result?.addons?.userAgent).toBeDefined();
  });
});
