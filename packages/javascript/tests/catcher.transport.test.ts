import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BreadcrumbManager } from '../src/addons/breadcrumbs';
import type { Transport } from '../src';
import { wait, createCatcher, createTransport } from './catcher.helpers';

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

  describe('transport failure', () => {
    it('should not throw when transport.send rejects', async () => {
      const transport: Transport = {
        send: vi.fn().mockRejectedValue(new Error('network error')),
      };

      const act = async () => {
        createCatcher(transport).send(new Error('e'));
        await wait();
      };

      await expect(act()).resolves.toBeUndefined();
    });
  });
});
