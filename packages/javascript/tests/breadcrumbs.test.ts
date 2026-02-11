import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BreadcrumbManager } from '../src/addons/breadcrumbs';
import type { Breadcrumb } from '@hawk.so/types';

function resetManager(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (BreadcrumbManager as any).instance = null;
}

describe('BreadcrumbManager', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetManager();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('should return empty array when no breadcrumbs added', () => {
    const m = BreadcrumbManager.getInstance();

    m.init();
    expect(m.getBreadcrumbs()).toEqual([]);
  });

  it('should store breadcrumb with auto-generated timestamp', () => {
    const m = BreadcrumbManager.getInstance();

    m.init();
    m.addBreadcrumb({ type: 'default', message: 'test', level: 'info' });

    const crumbs = m.getBreadcrumbs();

    expect(crumbs).toHaveLength(1);
    expect(crumbs[0].message).toBe('test');
    expect(crumbs[0].timestamp).toBeTypeOf('number');
  });

  it('should keep explicit timestamp as-is', () => {
    const m = BreadcrumbManager.getInstance();

    m.init();
    m.addBreadcrumb({ type: 'default', message: 'test', level: 'info', timestamp: 12345 });

    expect(m.getBreadcrumbs()[0].timestamp).toBe(12345);
  });

  it('should drop oldest breadcrumbs when buffer overflows (FIFO)', () => {
    const m = BreadcrumbManager.getInstance();

    m.init({ maxBreadcrumbs: 3 });

    for (let i = 0; i < 5; i++) {
      m.addBreadcrumb({ type: 'default', message: `msg-${i}`, level: 'info' });
    }

    const crumbs = m.getBreadcrumbs();

    expect(crumbs).toHaveLength(3);
    expect(crumbs[0].message).toBe('msg-2');
    expect(crumbs[2].message).toBe('msg-4');
  });

  it('should store max 15 breadcrumbs by default', () => {
    const m = BreadcrumbManager.getInstance();

    m.init();

    for (let i = 0; i < 20; i++) {
      m.addBreadcrumb({ type: 'default', message: `msg-${i}`, level: 'info' });
    }

    expect(m.getBreadcrumbs()).toHaveLength(15);
  });

  it('should empty buffer on clear', () => {
    const m = BreadcrumbManager.getInstance();

    m.init();
    m.addBreadcrumb({ type: 'default', message: 'test', level: 'info' });
    m.clearBreadcrumbs();

    expect(m.getBreadcrumbs()).toEqual([]);
  });

  it('should return a copy, not the internal array', () => {
    const m = BreadcrumbManager.getInstance();

    m.init();
    m.addBreadcrumb({ type: 'default', message: 'test', level: 'info' });

    const first = m.getBreadcrumbs();
    const second = m.getBreadcrumbs();

    expect(first).not.toBe(second);
    expect(first).toEqual(second);

    first.push({ type: 'default', message: 'injected', level: 'info', timestamp: 0 } as Breadcrumb);

    expect(m.getBreadcrumbs()).toHaveLength(1);
  });

  it('should ignore second init call', () => {
    const m = BreadcrumbManager.getInstance();

    m.init({ maxBreadcrumbs: 5 });
    m.init({ maxBreadcrumbs: 100 });

    for (let i = 0; i < 10; i++) {
      m.addBreadcrumb({ type: 'default', message: `msg-${i}`, level: 'info' });
    }

    expect(m.getBreadcrumbs()).toHaveLength(5);
  });
});

/**
 * Single manager with a branching beforeBreadcrumb.
 * Routes by bc.message:
 *
 *  "modify"  → mutate message, return bc
 *  "drop"    → return false
 *  "invalid" → return undefined (no return)
 *  "secret"  → return false (category filter)
 *  default   → return bc as-is
 */
describe('beforeBreadcrumb', () => {
  let manager: BreadcrumbManager;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    manager.clearBreadcrumbs();
    warnSpy.mockRestore();
  });

  resetManager();
  manager = BreadcrumbManager.getInstance();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  manager.init({
    beforeBreadcrumb(bc) {
      switch (bc.message) {
        case 'modify':
          bc.message = 'MODIFIED';

          return bc;

        case 'drop':
        case 'secret':
          return false;

        case 'invalid':
          return;

        default:
          return bc;
      }
    },
  });

  it('should store modified breadcrumb when hook returns changed object', () => {
    manager.addBreadcrumb({ type: 'default', message: 'modify', level: 'info' });

    expect(manager.getBreadcrumbs()[0].message).toBe('MODIFIED');
  });

  it('should discard breadcrumb when hook returns false', () => {
    manager.addBreadcrumb({ type: 'default', message: 'drop', level: 'info' });

    expect(manager.getBreadcrumbs()).toHaveLength(0);
  });

  it('should store original breadcrumb and warn when hook returns invalid value', () => {
    manager.addBreadcrumb({ type: 'default', message: 'invalid', level: 'info' });

    expect(manager.getBreadcrumbs()[0].message).toBe('invalid');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('beforeBreadcrumb returned nothing'),
      expect.anything(),
      expect.anything()
    );
  });

  it('should filter breadcrumbs by category', () => {
    manager.addBreadcrumb({ type: 'default', message: 'keep', level: 'info', category: 'public' });
    manager.addBreadcrumb({ type: 'default', message: 'secret', level: 'info', category: 'secret' });

    const crumbs = manager.getBreadcrumbs();

    expect(crumbs).toHaveLength(1);
    expect(crumbs[0].message).toBe('keep');
  });
});
