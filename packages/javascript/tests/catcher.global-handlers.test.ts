import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Catcher from '../src/catcher';
import { BreadcrumbManager } from '../src/addons/breadcrumbs';
import { TEST_TOKEN, wait, createTransport, getLastPayload } from './catcher.helpers';

const mockParse = vi.hoisted(() => vi.fn().mockResolvedValue([]));
vi.mock('@hawk.so/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hawk.so/core')>();
  return { ...actual, StackParser: class { parse = mockParse; } };
});

describe('Catcher', () => {
  beforeEach(() => {
    localStorage.clear();
    mockParse.mockResolvedValue([]);
    (BreadcrumbManager as any).instance = null;
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
});
