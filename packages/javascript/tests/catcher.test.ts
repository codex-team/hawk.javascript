import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Catcher from '../src/catcher';
import { BreadcrumbManager } from '../src/addons/breadcrumbs';
import { TEST_TOKEN, wait, createTransport, getLastPayload, createCatcher } from './catcher.helpers';

// StackParser is mocked to prevent real network calls to source files in the jsdom environment.
const mockParse = vi.hoisted(() => vi.fn().mockResolvedValue([]));
vi.mock('../src/modules/stackParser', () => ({
  default: class {
    parse = mockParse;
  },
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Catcher', () => {
  beforeEach(() => {
    localStorage.clear();
    mockParse.mockResolvedValue([]);
    (BreadcrumbManager as any).instance = null;
  });

  // ── Constructor variants ──────────────────────────────────────────────────
  //
  // The Catcher can be initialized with either a full settings object or a
  // bare string token as a shorthand.
  describe('constructor', () => {
    const listeners: Array<[string, EventListenerOrEventListenerObject]> = [];

    beforeEach(() => {
      const orig = window.addEventListener.bind(window);

      vi.spyOn(window, 'addEventListener').mockImplementation(
        (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
          listeners.push([type, listener]);
          return orig(type, listener, options as AddEventListenerOptions);
        }
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
      for (const [type, listener] of listeners) {
        window.removeEventListener(type, listener as EventListener);
      }
      listeners.length = 0;
    });

    it('should not throw when token provided via plain string shorthand', () => {
      expect(() => new Catcher(TEST_TOKEN)).not.toThrow();
    });

    it('should throw when integration token contains malformed JSON', () => {
      // getIntegrationId() tries JSON.parse(atob(token)); malformed JSON triggers the catch path.
      expect(() => new Catcher({ token: btoa('not-json') })).toThrow('Invalid integration token.');
    });

    it('should throw when integration token has no integrationId field', () => {
      // Valid base64 JSON but missing the integrationId property — inner guard throws.
      const tokenWithoutId = btoa(JSON.stringify({ secret: 'abc' }));

      expect(() => new Catcher({ token: tokenWithoutId })).toThrow('Invalid integration token.');
    });
  });

  // ── Error delivery ────────────────────────────────────────────────────────
  //
  // The Catcher's primary responsibility: capture errors and forward them to
  // the configured transport with identifying metadata.
  describe('error delivery', () => {
    it('should send payload composed from Error instance', async () => {
      const { sendSpy, transport } = createTransport();

      createCatcher(transport).send(new Error('something broke'));
      await wait();

      expect(sendSpy).toHaveBeenCalledOnce();
      expect(sendSpy.mock.calls[0][0].token).toBe(TEST_TOKEN);
      expect(sendSpy.mock.calls[0][0].catcherType).toBe('errors/javascript');
      expect(getLastPayload(sendSpy).title).toBe('something broke');
    });

    it('should send payload composed from string', async () => {
      const { sendSpy, transport } = createTransport();

      createCatcher(transport).send('unhandled rejection reason');
      await wait();

      expect(sendSpy).toHaveBeenCalledOnce();
      expect(sendSpy.mock.calls[0][0].token).toBe(TEST_TOKEN);
      expect(sendSpy.mock.calls[0][0].catcherType).toBe('errors/javascript');
      expect(getLastPayload(sendSpy).title).toBe('unhandled rejection reason');
    });

    it('should not send payload for same Error instance twice', async () => {
      const { sendSpy, transport } = createTransport();
      const hawk = createCatcher(transport);
      const error = new Error('duplicate');

      hawk.send(error);
      hawk.send(error);
      await wait();

      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('should send payload for distinct Error instances independently', async () => {
      const { sendSpy, transport } = createTransport();
      const hawk = createCatcher(transport);

      hawk.send(new Error('first'));
      hawk.send(new Error('second'));
      await wait();

      expect(sendSpy).toHaveBeenCalledTimes(2);
    });

    it('should send payload for same strings without deduplication', async () => {
      const { sendSpy, transport } = createTransport();
      const hawk = createCatcher(transport);

      hawk.send('reason');
      hawk.send('reason');
      await wait();

      expect(sendSpy).toHaveBeenCalledTimes(2);
    });
  });

  // ── test() convenience method ─────────────────────────────────────────────
  describe('test()', () => {
    it('should send a predefined test error event', async () => {
      const { sendSpy, transport } = createTransport();

      createCatcher(transport).test();
      await wait();

      expect(sendSpy).toHaveBeenCalledOnce();
      expect(getLastPayload(sendSpy).title).toContain('Hawk JavaScript Catcher test message');
    });
  });

  // ── Backtrace ─────────────────────────────────────────────────────────────
  describe('backtrace', () => {
    it('should omit backtrace when stack parsing throws', async () => {
      mockParse.mockRejectedValueOnce(new Error('parse failed'));

      const { sendSpy, transport } = createTransport();

      createCatcher(transport).send(new Error('stack parse failure'));
      await wait();

      expect(getLastPayload(sendSpy).title).toBe('stack parse failure');
      expect(sendSpy).toHaveBeenCalledOnce();
    });
  });
});

