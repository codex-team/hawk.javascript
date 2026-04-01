import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserBreadcrumbStore } from '../src/addons/breadcrumbs';
import { wait, createTransport, getLastPayload, createCatcher } from './catcher.helpers';

const mockParse = vi.hoisted(() => vi.fn().mockResolvedValue([]));
vi.mock('../src/modules/stackParser', () => ({
  default: class { parse = mockParse; },
}));

describe('Catcher', () => {
  beforeEach(() => {
    localStorage.clear();
    mockParse.mockResolvedValue([]);
    (BrowserBreadcrumbStore as any).instance?.destroy();
  });

  // ── User identity ─────────────────────────────────────────────────────────
  //
  // The Catcher tracks who caused the error. When no user is configured it
  // falls back to a generated anonymous ID that persists across events.
  describe('user identity', () => {

    it('should generate and persist anonymous ID when no user is configured', async () => {
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

    it('should include user configured via setUser()', async () => {
      const { sendSpy, transport } = createTransport();
      const hawk = createCatcher(transport);

      hawk.setUser({ id: 'user-1', name: 'Alice' });
      hawk.send(new Error('e'));
      await wait();

      expect(getLastPayload(sendSpy).user).toMatchObject({ id: 'user-1', name: 'Alice' });
    });

    it('should include user configured via constructor', async () => {
      const { sendSpy, transport } = createTransport();

      createCatcher(transport, { user: { id: 'user-2' } }).send(new Error('e'));
      await wait();

      expect(getLastPayload(sendSpy).user).toMatchObject({ id: 'user-2' });
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
});
