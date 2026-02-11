import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BreadcrumbManager } from '../src/addons/breadcrumbs';
import type { Breadcrumb } from '@hawk.so/types';

/**
 * Reset singleton so each test group starts fresh
 */
function resetManager(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (BreadcrumbManager as any).instance = null;
}

describe('BreadcrumbManager — basics', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetManager();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('no breadcrumbs → empty array', () => {
    const m = BreadcrumbManager.getInstance();

    m.init();
    expect(m.getBreadcrumbs()).toEqual([]);
  });

  it('add breadcrumb → breadcrumb stored with timestamp', () => {
    const m = BreadcrumbManager.getInstance();

    m.init();
    m.addBreadcrumb({ type: 'default', message: 'test', level: 'info' });

    const crumbs = m.getBreadcrumbs();

    expect(crumbs).toHaveLength(1);
    expect(crumbs[0].message).toBe('test');
    expect(crumbs[0].timestamp).toBeTypeOf('number');
  });

  it('explicit timestamp → breadcrumb kept as-is', () => {
    const m = BreadcrumbManager.getInstance();

    m.init();
    m.addBreadcrumb({ type: 'default', message: 'test', level: 'info', timestamp: 12345 });

    expect(m.getBreadcrumbs()[0].timestamp).toBe(12345);
  });

  it('overflow → oldest breadcrumbs dropped (FIFO) and stored in buffer', () => {
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

  it('default limit → 15 breadcrumbs max stored in buffer', () => {
    const m = BreadcrumbManager.getInstance();

    m.init();

    for (let i = 0; i < 20; i++) {
      m.addBreadcrumb({ type: 'default', message: `msg-${i}`, level: 'info' });
    }

    expect(m.getBreadcrumbs()).toHaveLength(15);
  });

  it('clear → empty breadcrumbs buffer', () => {
    const m = BreadcrumbManager.getInstance();

    m.init();
    m.addBreadcrumb({ type: 'default', message: 'test', level: 'info' });
    m.clearBreadcrumbs();

    expect(m.getBreadcrumbs()).toEqual([]);
  });

  it('get → returns copy of breadcrumbs, not internal array', () => {
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

  it('second init → ignored and stored in buffer', () => {
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
 *  "modify"       → mutate message, return bc
 *  "drop"         → return false
 *  "void"         → no return (undefined)
 *  "null"         → return null
 *  "invalid"      → return true
 *  "bad-ts"       → return object with non-numeric timestamp
 *  "secret"       → return false (category filter)
 *  default        → return bc as-is
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

  /**
   * Init once before all tests in this block
   */
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

        case 'void':
          return;

        case 'null':
          return null as any;

        case 'invalid':
          return true as any;

        case 'bad-ts':
          return { timestamp: 'nope', message: 'bad' } as any;

        default:
          return bc;
      }
    },
  });

  it('return modified breadcrumb → breadcrumb stored with changes', () => {
    manager.addBreadcrumb({ type: 'default', message: 'modify', level: 'info' });

    expect(manager.getBreadcrumbs()[0].message).toBe('MODIFIED');
  });

  it('return false → breadcrumb not stored in buffer', () => {
    manager.addBreadcrumb({ type: 'default', message: 'drop', level: 'info' });

    expect(manager.getBreadcrumbs()).toHaveLength(0);
  });

  it('return undefined → original breadcrumb stored in buffer + warn', () => {
    manager.addBreadcrumb({ type: 'default', message: 'void', level: 'info' });

    expect(manager.getBreadcrumbs()[0].message).toBe('void');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('beforeBreadcrumb returned nothing'),
      expect.anything(),
      expect.anything()
    );
  });

  it('return null → original breadcrumb stored in buffer + warn', () => {
    manager.addBreadcrumb({ type: 'default', message: 'null', level: 'info' });

    expect(manager.getBreadcrumbs()[0].message).toBe('null');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('beforeBreadcrumb returned nothing'),
      expect.anything(),
      expect.anything()
    );
  });

  it('return true → original breadcrumb stored in buffer + warn', () => {
    manager.addBreadcrumb({ type: 'default', message: 'invalid', level: 'info' });

    expect(manager.getBreadcrumbs()[0].message).toBe('invalid');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('beforeBreadcrumb produced invalid breadcrumb'),
      expect.anything(),
      expect.anything()
    );
  });

  it('return bad timestamp → original breadcrumb stored + warn', () => {
    manager.addBreadcrumb({ type: 'default', message: 'bad-ts', level: 'info' });

    const bc = manager.getBreadcrumbs()[0];

    expect(bc.message).toBe('bad-ts');
    expect(bc.timestamp).toBeTypeOf('number');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('beforeBreadcrumb produced invalid breadcrumb'),
      expect.anything(),
      expect.anything()
    );
  });

  it('return false by category → breadcrumb filtered out', () => {
    manager.addBreadcrumb({ type: 'default', message: 'keep', level: 'info', category: 'public' });
    manager.addBreadcrumb({ type: 'default', message: 'secret', level: 'info', category: 'secret' });

    const crumbs = manager.getBreadcrumbs();

    expect(crumbs).toHaveLength(1);
    expect(crumbs[0].message).toBe('keep');
  });
});
