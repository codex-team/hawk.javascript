import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserBreadcrumbStore } from '../src/addons/breadcrumbs';
import { wait, createTransport, getLastPayload, createCatcher } from './catcher.helpers';

const mockParse = vi.hoisted(() => vi.fn().mockResolvedValue([]));
vi.mock('@hawk.so/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hawk.so/core')>();
  return { ...actual, StackParser: class { parse = mockParse; } };
});

describe('Catcher', () => {
  beforeEach(() => {
    localStorage.clear();
    mockParse.mockResolvedValue([]);
    (BrowserBreadcrumbStore as any).instance?.destroy();
  });

  // ── Context enrichment ────────────────────────────────────────────────────
  //
  // The Catcher attaches arbitrary developer-supplied context data to every event.
  describe('context enrichment', () => {

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
});
