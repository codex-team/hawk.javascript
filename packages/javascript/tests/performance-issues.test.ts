import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Metric, ReportCallback } from 'web-vitals';
import {
  DEFAULT_LONG_TASK_THRESHOLD_MS,
  MIN_ISSUE_THRESHOLD_MS,
} from '../src/addons/performance-issues';

class MockPerformanceObserver {
  public static supportedEntryTypes: string[] = ['longtask', 'long-animation-frame'];
  public static instances: MockPerformanceObserver[] = [];

  public disconnected = false;
  public observedType: string | null = null;

  private readonly callback: PerformanceObserverCallback;

  public constructor(callback: PerformanceObserverCallback) {
    this.callback = callback;
    MockPerformanceObserver.instances.push(this);
  }

  public observe(options: PerformanceObserverInit & { type?: string }): void {
    this.observedType = options.type ?? null;
  }

  public disconnect(): void {
    this.disconnected = true;
  }

  public emit(entries: PerformanceEntry[]): void {
    this.callback(
      { getEntries: () => entries } as PerformanceObserverEntryList,
      this as unknown as PerformanceObserver
    );
  }

  public static byType(type: string): MockPerformanceObserver | undefined {
    return MockPerformanceObserver.instances.find((instance) => instance.observedType === type);
  }

  public static reset(): void {
    MockPerformanceObserver.instances = [];
    MockPerformanceObserver.supportedEntryTypes = ['longtask', 'long-animation-frame'];
  }
}

function entry(type: string, duration: number, extra: Record<string, unknown> = {}): PerformanceEntry {
  return {
    entryType: type,
    name: type,
    startTime: 0,
    duration,
    toJSON: () => ({}),
    ...extra,
  } as PerformanceEntry;
}

function mockWebVitals() {
  const callbacks: Record<string, ReportCallback | undefined> = {};

  vi.doMock('web-vitals', () => ({
    onCLS: (cb: ReportCallback) => { callbacks.CLS = cb; },
    onINP: (cb: ReportCallback) => { callbacks.INP = cb; },
    onLCP: (cb: ReportCallback) => { callbacks.LCP = cb; },
    onFCP: (cb: ReportCallback) => { callbacks.FCP = cb; },
    onTTFB: (cb: ReportCallback) => { callbacks.TTFB = cb; },
  }));

  return {
    emit(metric: Metric): void {
      callbacks[metric.name]?.(metric);
    },
  };
}

function mockGlobalWebVitals() {
  const callbacks: Record<string, ReportCallback | undefined> = {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).webVitals = {
    onCLS: (cb: ReportCallback) => { callbacks.CLS = cb; },
    onINP: (cb: ReportCallback) => { callbacks.INP = cb; },
    onLCP: (cb: ReportCallback) => { callbacks.LCP = cb; },
    onFCP: (cb: ReportCallback) => { callbacks.FCP = cb; },
    onTTFB: (cb: ReportCallback) => { callbacks.TTFB = cb; },
  };

  return {
    emit(metric: Metric): void {
      callbacks[metric.name]?.(metric);
    },
    cleanup(): void {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).webVitals;
    },
  };
}

describe('PerformanceIssuesMonitor', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).webVitals;
    MockPerformanceObserver.reset();
    vi.stubGlobal('PerformanceObserver', MockPerformanceObserver as unknown as typeof PerformanceObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).webVitals;
  });

  it('should clamp long task threshold to 50ms minimum', async () => {
    mockWebVitals();
    const { PerformanceIssuesMonitor } = await import('../src/addons/performance-issues');
    const onIssue = vi.fn();
    const monitor = new PerformanceIssuesMonitor();

    monitor.init({ longTasks: { thresholdMs: 1 }, longAnimationFrames: false, webVitals: false }, onIssue);
    const observer = MockPerformanceObserver.byType('longtask');

    expect(observer).toBeDefined();

    observer!.emit([entry('longtask', MIN_ISSUE_THRESHOLD_MS - 1)]);
    expect(onIssue).not.toHaveBeenCalled();

    observer!.emit([entry('longtask', MIN_ISSUE_THRESHOLD_MS)]);
    expect(onIssue).toHaveBeenCalledTimes(1);
  });

  it('should emit only entries that are >= configured threshold', async () => {
    mockWebVitals();
    const { PerformanceIssuesMonitor } = await import('../src/addons/performance-issues');
    const onIssue = vi.fn();
    const monitor = new PerformanceIssuesMonitor();

    const customThresholdMs = 75;

    monitor.init({ longTasks: { thresholdMs: customThresholdMs }, longAnimationFrames: false, webVitals: false }, onIssue);
    const observer = MockPerformanceObserver.byType('longtask');

    expect(observer).toBeDefined();

    observer!.emit([entry('longtask', customThresholdMs - 1)]);
    expect(onIssue).not.toHaveBeenCalled();

    observer!.emit([entry('longtask', customThresholdMs)]);
    expect(onIssue).toHaveBeenCalledTimes(1);
    expect(onIssue.mock.calls[0][0].title).toContain(`${customThresholdMs} ms`);
  });

  it('should use default threshold when longTasks is true', async () => {
    mockWebVitals();
    const { PerformanceIssuesMonitor } = await import('../src/addons/performance-issues');
    const onIssue = vi.fn();
    const monitor = new PerformanceIssuesMonitor();

    monitor.init({ longTasks: true, longAnimationFrames: false, webVitals: false }, onIssue);
    const observer = MockPerformanceObserver.byType('longtask');

    expect(observer).toBeDefined();

    observer!.emit([entry('longtask', DEFAULT_LONG_TASK_THRESHOLD_MS - 1)]);
    expect(onIssue).not.toHaveBeenCalled();

    observer!.emit([entry('longtask', DEFAULT_LONG_TASK_THRESHOLD_MS)]);
    expect(onIssue).toHaveBeenCalledTimes(1);
  });

  it('should ignore second init call and avoid duplicate observers', async () => {
    mockWebVitals();
    const { PerformanceIssuesMonitor } = await import('../src/addons/performance-issues');
    const monitor = new PerformanceIssuesMonitor();
    const onIssue = vi.fn();

    monitor.init({ longTasks: {}, longAnimationFrames: {}, webVitals: false }, onIssue);
    monitor.init({ longTasks: {}, longAnimationFrames: {}, webVitals: false }, onIssue);

    expect(MockPerformanceObserver.instances).toHaveLength(2);
  });

  it('should disconnect and stop reporting after destroy', async () => {
    mockWebVitals();
    const { PerformanceIssuesMonitor } = await import('../src/addons/performance-issues');
    const onIssue = vi.fn();
    const monitor = new PerformanceIssuesMonitor();

    monitor.init({ longTasks: {}, longAnimationFrames: false, webVitals: false }, onIssue);
    const observer = MockPerformanceObserver.byType('longtask');

    expect(observer).toBeDefined();

    observer!.emit([entry('longtask', 120)]);
    expect(onIssue).toHaveBeenCalledTimes(1);

    monitor.destroy();
    expect(observer!.disconnected).toBe(true);

    observer!.emit([entry('longtask', 130)]);
    expect(onIssue).toHaveBeenCalledTimes(1);
  });

  it('should skip observers when performance entry types are unsupported', async () => {
    MockPerformanceObserver.supportedEntryTypes = [];
    mockWebVitals();
    const { PerformanceIssuesMonitor } = await import('../src/addons/performance-issues');
    const monitor = new PerformanceIssuesMonitor();

    monitor.init({ longTasks: {}, longAnimationFrames: {}, webVitals: false }, vi.fn());

    expect(MockPerformanceObserver.instances).toHaveLength(0);
  });

  it('should report poor web vital metric immediately', async () => {
    const webVitals = mockWebVitals();
    const { PerformanceIssuesMonitor } = await import('../src/addons/performance-issues');
    const onIssue = vi.fn();
    const monitor = new PerformanceIssuesMonitor();

    monitor.init({ longTasks: false, longAnimationFrames: false, webVitals: true }, onIssue);
    await vi.dynamicImportSettled();

    webVitals.emit({ name: 'LCP', value: 5000, rating: 'poor', delta: 5000 });

    expect(onIssue).toHaveBeenCalledTimes(1);
    expect(onIssue.mock.calls[0][0].title).toContain('Poor Web Vital');
    expect(onIssue.mock.calls[0][0].context).toHaveProperty('webVitals');
  });

  it('should use global webVitals API when available (CDN scenario)', async () => {
    const globalWebVitals = mockGlobalWebVitals();
    const { PerformanceIssuesMonitor } = await import('../src/addons/performance-issues');
    const onIssue = vi.fn();
    const monitor = new PerformanceIssuesMonitor();

    monitor.init({ longTasks: false, longAnimationFrames: false, webVitals: true }, onIssue);
    await vi.dynamicImportSettled();

    globalWebVitals.emit({ name: 'INP', value: 600, rating: 'poor', delta: 600 });

    expect(onIssue).toHaveBeenCalledTimes(1);
    expect(onIssue.mock.calls[0][0].title).toContain('Poor Web Vital');
    globalWebVitals.cleanup();
  });

  it('should not emit event for non-poor web vital metric', async () => {
    const webVitals = mockWebVitals();
    const { PerformanceIssuesMonitor } = await import('../src/addons/performance-issues');
    const onIssue = vi.fn();
    const monitor = new PerformanceIssuesMonitor();

    monitor.init({ longTasks: false, longAnimationFrames: false, webVitals: true }, onIssue);
    await vi.dynamicImportSettled();

    webVitals.emit({ name: 'FCP', value: 1800, rating: 'good', delta: 1800 });
    expect(onIssue).not.toHaveBeenCalled();
  });

});
