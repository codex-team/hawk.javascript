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

describe('beforeBreadcrumb', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetManager();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('should store modified breadcrumb when hook returns changed object', () => {
    // Arrange
    const m = BreadcrumbManager.getInstance();

    m.init({
      beforeBreadcrumb(bc) {
        bc.message = 'MODIFIED';

        return bc;
      },
    });

    // Act
    m.addBreadcrumb({ type: 'default', message: 'original', level: 'info' });

    // Assert
    expect(m.getBreadcrumbs()[0].message).toBe('MODIFIED');
  });

  it('should not store breadcrumb when hook returns false', () => {
    // Arrange
    const m = BreadcrumbManager.getInstance();

    m.init({
      beforeBreadcrumb: () => false,
    });

    // Act
    m.addBreadcrumb({ type: 'default', message: 'drop', level: 'info' });

    // Assert
    expect(m.getBreadcrumbs()).toHaveLength(0);
  });

  it.each([
    { label: 'undefined', value: undefined },
    { label: 'null', value: null },
    { label: 'number (42)', value: 42 },
    { label: 'string ("oops")', value: 'oops' },
    { label: 'true', value: true },
  ])('should store original breadcrumb and warn when hook returns $label', ({ value }) => {
    // Arrange
    const m = BreadcrumbManager.getInstance();

    m.init({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      beforeBreadcrumb: () => value as any,
    });

    // Act
    m.addBreadcrumb({ type: 'default', message: 'original', level: 'info' });

    // Assert
    expect(m.getBreadcrumbs()[0].message).toBe('original');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid beforeBreadcrumb value'),
      expect.anything(),
      expect.anything()
    );
  });

  it('should store original breadcrumb and warn when hook deletes required field (message)', () => {
    // Arrange
    const m = BreadcrumbManager.getInstance();

    m.init({
      beforeBreadcrumb(bc) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (bc as any).message;

        return bc;
      },
    });

    // Act
    m.addBreadcrumb({ type: 'default', message: 'keep-me', level: 'info' });

    // Assert — fallback to original, message preserved
    expect(m.getBreadcrumbs()[0].message).toBe('keep-me');
  });

  it('should filter breadcrumbs by category using hook', () => {
    // Arrange
    const m = BreadcrumbManager.getInstance();

    m.init({
      beforeBreadcrumb(bc) {
        return bc.category === 'secret' ? false : bc;
      },
    });

    // Act
    m.addBreadcrumb({ type: 'default', message: 'public', level: 'info', category: 'public' });
    m.addBreadcrumb({ type: 'default', message: 'secret', level: 'info', category: 'secret' });

    // Assert
    const crumbs = m.getBreadcrumbs();

    expect(crumbs).toHaveLength(1);
    expect(crumbs[0].message).toBe('public');
  });
});
