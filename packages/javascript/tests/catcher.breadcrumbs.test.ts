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

  // ── Breadcrumbs trail ─────────────────────────────────────────────────────
  //
  // The Catcher maintains a chronological trail of events leading up to the
  // error. The trail is included in delivered events only when non-empty.
  describe('breadcrumbs trail', () => {
    it('should include recorded breadcrumbs', async () => {
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

    it('should omit breadcrumbs cleared before payload was sent', async () => {
      const { sendSpy, transport } = createTransport();
      const hawk = createCatcher(transport, { breadcrumbs: {} });

      hawk.breadcrumbs.add({ message: 'click', timestamp: Date.now() });
      hawk.breadcrumbs.clear();
      hawk.send(new Error('e'));
      await wait();

      expect(getLastPayload(sendSpy).breadcrumbs).toBeFalsy();
    });
  });
});
