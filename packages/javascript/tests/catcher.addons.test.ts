import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BreadcrumbManager } from '../src/addons/breadcrumbs';
import { wait, createTransport, getLastPayload, createCatcher } from './catcher.helpers';

const mockParse = vi.hoisted(() => vi.fn().mockResolvedValue([]));
vi.mock('../src/modules/stackParser', () => ({
  default: class { parse = mockParse; },
}));

describe('Catcher', () => {
  beforeEach(() => {
    localStorage.clear();
    mockParse.mockResolvedValue([]);
    (BreadcrumbManager as any).instance = null;
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

  // ── Integration addons ────────────────────────────────────────────────────
  //
  // Framework integrations (Vue, Nuxt, etc.) attach extra addons when
  // reporting errors via captureError(). These are merged into the payload
  // alongside the standard browser addons.
  describe('integration addons via captureError()', () => {
    it('should merge integration-specific addons', async () => {
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
});
