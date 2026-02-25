import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Catcher from '../src/catcher';
import { BreadcrumbManager } from '../src/addons/breadcrumbs';
import type { Transport } from '../src';

const TEST_TOKEN = 'eyJpbnRlZ3JhdGlvbklkIjoiOTU3MmQyOWQtNWJhZS00YmYyLTkwN2MtZDk5ZDg5MGIwOTVmIiwic2VjcmV0IjoiZTExODFiZWItMjdlMS00ZDViLWEwZmEtZmUwYTM1Mzg5OWMyIn0=';
const wait = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (BreadcrumbManager as any).instance = null;
  });

  // ── Error delivery ────────────────────────────────────────────────────────
  //
  // The Catcher's primary responsibility: capture errors and forward them to
  // the configured transport with identifying metadata.
  describe('error delivery', () => {
    it('should deliver an Error instance via transport with matching title', async () => {
      const { sendSpy, transport } = createTransport();

      createCatcher(transport).send(new Error('something broke'));
      await wait();

      expect(sendSpy).toHaveBeenCalledOnce();
      expect(sendSpy.mock.calls[0][0].token).toBe(TEST_TOKEN);
      expect(sendSpy.mock.calls[0][0].catcherType).toBe('errors/javascript');
      expect(getLastPayload(sendSpy).title).toBe('something broke');
    });

    it('should deliver a string-based error via transport with matching title', async () => {
      const { sendSpy, transport } = createTransport();

      createCatcher(transport).send('unhandled rejection reason');
      await wait();

      expect(sendSpy).toHaveBeenCalledOnce();
      expect(sendSpy.mock.calls[0][0].token).toBe(TEST_TOKEN);
      expect(sendSpy.mock.calls[0][0].catcherType).toBe('errors/javascript');
      expect(getLastPayload(sendSpy).title).toBe('unhandled rejection reason');
    });

    it('should not deliver the same Error instance twice', async () => {
      const { sendSpy, transport } = createTransport();
      const hawk = createCatcher(transport);
      const error = new Error('duplicate');

      hawk.send(error);
      hawk.send(error);
      await wait();

      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('should deliver distinct Error instances independently', async () => {
      const { sendSpy, transport } = createTransport();
      const hawk = createCatcher(transport);

      hawk.send(new Error('first'));
      hawk.send(new Error('second'));
      await wait();

      expect(sendSpy).toHaveBeenCalledTimes(2);
    });

    it('should deliver string errors without deduplication', async () => {
      const { sendSpy, transport } = createTransport();
      const hawk = createCatcher(transport);

      hawk.send('reason');
      hawk.send('reason');
      await wait();

      expect(sendSpy).toHaveBeenCalledTimes(2);
    });
  });

  // ── User identity ─────────────────────────────────────────────────────────
  //
  // The Catcher tracks who caused the error. When no user is configured it
  // falls back to a generated anonymous ID that persists across events.
  describe('user identity', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('should generate a stable anonymous ID when no user is configured', async () => {
      const { sendSpy, transport } = createTransport();
      const hawk = createCatcher(transport);

      hawk.send(new Error('first'));
      await wait();
      const id1 = getLastPayload(sendSpy).user?.id;

      hawk.send(new Error('second'));
      await wait();
      const id2 = getLastPayload(sendSpy).user?.id;

      expect(id1).toBeTruthy();
      expect(id1).toBe(id2);
    });

    it('should include the user configured via setUser()', async () => {
      const { sendSpy, transport } = createTransport();
      const hawk = createCatcher(transport);

      hawk.setUser({ id: 'user-1', name: 'Alice' });
      hawk.send(new Error('e'));
      await wait();

      expect(getLastPayload(sendSpy).user).toMatchObject({ id: 'user-1', name: 'Alice' });
    });

    it('should include the user configured via constructor', async () => {
      const { sendSpy, transport } = createTransport();

      createCatcher(transport, { user: { id: 'user-2' } }).send(new Error('e'));
      await wait();

      expect(getLastPayload(sendSpy).user).toMatchObject({ id: 'user-2' });
    });

    it('should ignore setUser when called with null', async () => {
      const { sendSpy, transport } = createTransport();
      const hawk = createCatcher(transport);

      hawk.setUser({ id: 'valid' });
      hawk.setUser(null as never);
      hawk.send(new Error('e'));
      await wait();

      expect(getLastPayload(sendSpy).user?.id).toBe('valid');
    });

    it('should ignore setUser when the user has no id', async () => {
      const { sendSpy, transport } = createTransport();
      const hawk = createCatcher(transport);

      hawk.setUser({ id: 'valid' });
      hawk.setUser({} as never);
      hawk.send(new Error('e'));
      await wait();

      expect(getLastPayload(sendSpy).user?.id).toBe('valid');
    });

    it('should revert to an anonymous identity after clearUser()', async () => {
      const { sendSpy, transport } = createTransport();
      const hawk = createCatcher(transport);

      hawk.setUser({ id: 'user-1' });
      hawk.clearUser();
      hawk.send(new Error('e'));
      await wait();

      const user = getLastPayload(sendSpy).user;

      expect(user?.id).toBeTruthy();
      expect(user?.id).not.toBe('user-1');
    });
  });

  // ── Context enrichment ────────────────────────────────────────────────────
  //
  // The Catcher attaches contextual information to every event: an optional
  // release version and arbitrary developer-supplied context data.
  describe('context enrichment', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('should include the release version when configured', async () => {
      const { sendSpy, transport } = createTransport();

      createCatcher(transport, { release: '1.2.3' }).send(new Error('e'));
      await wait();

      expect(getLastPayload(sendSpy).release).toBe('1.2.3');
    });

    it('should omit the release when not configured', async () => {
      const { sendSpy, transport } = createTransport();

      createCatcher(transport).send(new Error('e'));
      await wait();

      expect(getLastPayload(sendSpy).release).toBeFalsy();
    });

    it('should include global context set via setContext()', async () => {
      const { sendSpy, transport } = createTransport();
      const hawk = createCatcher(transport);

      hawk.setContext({ env: 'production' });
      hawk.send(new Error('e'));
      await wait();

      expect(getLastPayload(sendSpy).context).toMatchObject({ env: 'production' });
    });

    it('should include per-send context passed to send()', async () => {
      const { sendSpy, transport } = createTransport();

      createCatcher(transport).send(new Error('e'), { requestId: 'abc123' });
      await wait();

      expect(getLastPayload(sendSpy).context).toMatchObject({ requestId: 'abc123' });
    });

    it('should ignore setContext when called with a non-object value', async () => {
      const { sendSpy, transport } = createTransport();
      const hawk = createCatcher(transport);

      hawk.setContext({ original: true });
      hawk.setContext(42 as never);
      hawk.send(new Error('e'));
      await wait();

      expect(getLastPayload(sendSpy).context).toMatchObject({ original: true });
    });

    it('should merge global and per-send context, per-send wins on key collision', async () => {
      const { sendSpy, transport } = createTransport();
      const hawk = createCatcher(transport, { context: { key: 'global', shared: 1 } });

      hawk.send(new Error('e'), { key: 'local', extra: 2 });
      await wait();

      expect(getLastPayload(sendSpy).context).toMatchObject({
        key: 'local',
        shared: 1,
        extra: 2,
      });
    });
  });

  // ── Breadcrumbs trail ─────────────────────────────────────────────────────
  //
  // The Catcher maintains a chronological trail of events leading up to the
  // error. The trail is included in delivered events only when non-empty.
  describe('breadcrumbs trail', () => {
    it('should include recorded breadcrumbs in delivered events', async () => {
      const { sendSpy, transport } = createTransport();
      const hawk = createCatcher(transport, { breadcrumbs: {} });

      hawk.breadcrumbs.add({ message: 'button clicked', timestamp: Date.now() });
      hawk.send(new Error('e'));
      await wait();

      const breadcrumbs = getLastPayload(sendSpy).breadcrumbs;

      expect(Array.isArray(breadcrumbs)).toBe(true);
      expect(breadcrumbs[0].message).toBe('button clicked');
    });

    it('should omit breadcrumbs when none have been recorded', async () => {
      const { sendSpy, transport } = createTransport();

      createCatcher(transport, { breadcrumbs: {} }).send(new Error('e'));
      await wait();

      expect(getLastPayload(sendSpy).breadcrumbs).toBeFalsy();
    });

    it('should return an empty array from breadcrumbs.get when breadcrumbs are disabled', () => {
      const { transport } = createTransport();

      expect(createCatcher(transport).breadcrumbs.get()).toEqual([]);
    });

    it('should omit breadcrumbs cleared before the event was sent', async () => {
      const { sendSpy, transport } = createTransport();
      const hawk = createCatcher(transport, { breadcrumbs: {} });

      hawk.breadcrumbs.add({ message: 'click', timestamp: Date.now() });
      hawk.breadcrumbs.clear();
      hawk.send(new Error('e'));
      await wait();

      expect(getLastPayload(sendSpy).breadcrumbs).toBeFalsy();
    });
  });

  // ── Integration addons ────────────────────────────────────────────────────
  //
  // Framework integrations (Vue, Nuxt, etc.) attach extra addons when
  // reporting errors via captureError(). These are merged into the payload
  // alongside the standard browser addons.
  describe('integration addons via captureError()', () => {
    it('should merge integration-specific addons into the delivered event', async () => {
      const { sendSpy, transport } = createTransport();

      createCatcher(transport).captureError(new Error('e'), {
        vue: { component: '<App />', props: {}, lifecycle: 'mounted' },
      });
      await wait();

      expect(getLastPayload(sendSpy).addons).toMatchObject({
        vue: { component: '<App />', props: {}, lifecycle: 'mounted' },
      });
    });

    it('should preserve standard browser addons when integration addons are merged', async () => {
      const { sendSpy, transport } = createTransport();

      createCatcher(transport).captureError(new Error('e'), {
        vue: { component: '<Foo />', props: {}, lifecycle: 'mounted' },
      });
      await wait();

      const addons = getLastPayload(sendSpy).addons;

      expect(addons.userAgent).toBeDefined();
      expect(addons.url).toBeDefined();
    });
  });

  // ── Constructor variants ──────────────────────────────────────────────────
  //
  // The Catcher can be initialised with either a full settings object or a
  // bare string token as a shorthand.
  describe('constructor', () => {
    it('should accept a plain string as a shorthand for the token', async () => {
      const sendSpy = vi.fn().mockResolvedValue(undefined);
      const transport: Transport = { send: sendSpy };

      const hawk = new Catcher({
        token: TEST_TOKEN,
        disableGlobalErrorsHandling: true,
        breadcrumbs: false,
        consoleTracking: false,
        transport,
      });

      hawk.send(new Error('shorthand'));
      await wait();

      expect(sendSpy).toHaveBeenCalledOnce();
      expect(sendSpy.mock.calls[0][0].token).toBe(TEST_TOKEN);
    });

    it('should warn and silently do nothing when no token is provided', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const hawk = new Catcher({ token: '' } as never);

      hawk.send(new Error('no-token'));
      await wait();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Integration Token is missed'),
        expect.anything(),
        expect.anything()
      );

      warnSpy.mockRestore();
    });

    it('should construct without error when given a bare token string', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const addELSpy = vi.spyOn(window, 'addEventListener').mockImplementation(() => undefined);

      expect(() => new Catcher(TEST_TOKEN)).not.toThrow();

      addELSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should throw when the integration token contains malformed JSON', () => {
      // getIntegrationId() tries JSON.parse(atob(token)); malformed JSON triggers the catch path.
      expect(() => new Catcher({ token: btoa('not-json') })).toThrow('Invalid integration token.');
    });

    it('should throw when the integration token has no integrationId field', () => {
      // Valid base64 JSON but missing the integrationId property — inner guard throws.
      const tokenWithoutId = btoa(JSON.stringify({ secret: 'abc' }));

      expect(() => new Catcher({ token: tokenWithoutId })).toThrow('Invalid integration token.');
    });
  });

  // ── test() convenience method ─────────────────────────────────────────────
  describe('test()', () => {
    it('should send a predefined test error event via transport', async () => {
      const { sendSpy, transport } = createTransport();

      createCatcher(transport).test();
      await wait();

      expect(sendSpy).toHaveBeenCalledOnce();
      expect(getLastPayload(sendSpy).title).toContain('Hawk JavaScript Catcher test message');
    });
  });

  // ── Global error handlers ─────────────────────────────────────────────────
  //
  // When disableGlobalErrorsHandling is not set, the Catcher listens to
  // window 'error' and 'unhandledrejection' events.
  describe('global error handlers', () => {
    const addedListeners: Array<[string, EventListenerOrEventListenerObject]> = [];

    beforeEach(() => {
      const origAddEL = window.addEventListener.bind(window);

      vi.spyOn(window, 'addEventListener').mockImplementation(
        (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
          if (type === 'error' || type === 'unhandledrejection') {
            addedListeners.push([type, listener]);
          }
          return origAddEL(type, listener, options as AddEventListenerOptions);
        }
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
      for (const [type, listener] of addedListeners) {
        window.removeEventListener(type, listener as EventListener);
      }
      addedListeners.length = 0;
    });

    it('should capture errors from window error events', async () => {
      const { sendSpy, transport } = createTransport();

      new Catcher({
        token: TEST_TOKEN,
        breadcrumbs: false,
        consoleTracking: false,
        transport,
        // disableGlobalErrorsHandling not set → handlers registered
      });

      window.dispatchEvent(
        new ErrorEvent('error', { error: new Error('global error'), message: 'global error' })
      );
      await wait();

      expect(sendSpy).toHaveBeenCalledOnce();
      expect(getLastPayload(sendSpy).title).toBe('global error');
    });

    it('should capture CORS script errors where error object is unavailable', async () => {
      const { sendSpy, transport } = createTransport();

      new Catcher({
        token: TEST_TOKEN,
        breadcrumbs: false,
        consoleTracking: false,
        transport,
      });

      // CORS case: error property is undefined, only message is available.
      window.dispatchEvent(
        new ErrorEvent('error', { error: undefined, message: 'Script error.' })
      );
      await wait();

      expect(sendSpy).toHaveBeenCalledOnce();
      expect(getLastPayload(sendSpy).title).toBe('Script error.');
    });

    it('should capture unhandled promise rejections', async () => {
      const { sendSpy, transport } = createTransport();

      new Catcher({
        token: TEST_TOKEN,
        breadcrumbs: false,
        consoleTracking: false,
        transport,
      });

      window.dispatchEvent(
        new PromiseRejectionEvent('unhandledrejection', {
          promise: Promise.resolve() as Promise<never>,
          reason: new Error('rejected'),
        })
      );
      await wait();

      expect(sendSpy).toHaveBeenCalledOnce();
      expect(getLastPayload(sendSpy).title).toBe('rejected');
    });
  });

  // ── Transport failure ─────────────────────────────────────────────────────
  describe('transport failure', () => {
    it('should log a warning when transport.send rejects', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const transport: Transport = {
        send: vi.fn().mockRejectedValue(new Error('network error')),
      };

      createCatcher(transport).send(new Error('e'));
      await wait();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('WebSocket sending error'),
        expect.anything(),
        expect.anything(),
        expect.anything()
      );

      errorSpy.mockRestore();
    });

    it('should log a warning when beforeSend throws unexpectedly', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { transport } = createTransport();

      createCatcher(transport, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        beforeSend: () => { throw new Error('beforeSend crashed'); },
      } as never).send(new Error('e'));
      await wait();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unable to send error'),
        expect.anything(),
        expect.anything(),
        expect.anything()
      );

      warnSpy.mockRestore();
    });
  });

  // ── Environment addons ────────────────────────────────────────────────────
  //
  // Browser-specific data collected from window (URL, GET params, debug info).
  describe('environment addons', () => {
    it('should include GET parameters when the URL has a query string', async () => {
      vi.stubGlobal('location', {
        ...window.location,
        search: '?foo=bar&baz=qux',
        href: 'http://localhost/?foo=bar&baz=qux',
      });

      const { sendSpy, transport } = createTransport();

      createCatcher(transport).send(new Error('e'));
      await wait();

      expect(getLastPayload(sendSpy).addons.get).toEqual({ foo: 'bar', baz: 'qux' });

      vi.unstubAllGlobals();
    });

    it('should include raw error data in debug mode', async () => {
      const { sendSpy, transport } = createTransport();
      const error = new Error('debug error');

      createCatcher(transport, { debug: true }).send(error);
      await wait();

      expect(getLastPayload(sendSpy).addons.RAW_EVENT_DATA).toMatchObject({
        name: 'Error',
        message: 'debug error',
        stack: expect.any(String),
      });
    });

    it('should not include raw error data for string errors even in debug mode', async () => {
      const { sendSpy, transport } = createTransport();

      createCatcher(transport, { debug: true }).send('string reason');
      await wait();

      expect(getLastPayload(sendSpy).addons.RAW_EVENT_DATA).toBeUndefined();
    });
  });

  // ── Backtrace ─────────────────────────────────────────────────────────────
  describe('backtrace', () => {
    it('should omit backtrace when stack parsing throws', async () => {
      mockParse.mockRejectedValueOnce(new Error('parse failed'));

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { sendSpy, transport } = createTransport();

      createCatcher(transport).send(new Error('stack parse failure'));
      await wait();

      expect(getLastPayload(sendSpy).title).toBe('stack parse failure');
      expect(sendSpy).toHaveBeenCalledOnce();

      warnSpy.mockRestore();
    });
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createTransport() {
  const sendSpy = vi.fn().mockResolvedValue(undefined);
  const transport: Transport = { send: sendSpy };

  return { sendSpy, transport };
}

/** Returns the payload of the last call to transport.send. */
function getLastPayload(spy: ReturnType<typeof vi.fn>) {
  const calls = spy.mock.calls;

  return calls[calls.length - 1][0].payload;
}

function createCatcher(transport: Transport, options: Record<string, unknown> = {}) {
  return new Catcher({
    token: TEST_TOKEN,
    disableGlobalErrorsHandling: true,
    breadcrumbs: false,
    consoleTracking: false,
    transport,
    ...options,
  });
}
