import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Metric, ReportCallback } from 'web-vitals';

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

describe('IssuesMonitor', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
    MockPerformanceObserver.reset();
    vi.stubGlobal('PerformanceObserver', MockPerformanceObserver as unknown as typeof PerformanceObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should clamp long task threshold to 50ms minimum', async () => {
    mockWebVitals();
    const { IssuesMonitor } = await import('../src/addons/issues');
    const onIssue = vi.fn();
    const monitor = new IssuesMonitor();

    monitor.init({ longTasks: { thresholdMs: 1 }, longAnimationFrames: false, webVitals: false }, onIssue);
    const observer = MockPerformanceObserver.byType('longtask');

    expect(observer).toBeDefined();

    observer!.emit([entry('longtask', 49)]);
    expect(onIssue).not.toHaveBeenCalled();

    observer!.emit([entry('longtask', 50)]);
    expect(onIssue).toHaveBeenCalledTimes(1);
  });

  it('should emit only entries that are >= configured threshold', async () => {
    mockWebVitals();
    const { IssuesMonitor } = await import('../src/addons/issues');
    const onIssue = vi.fn();
    const monitor = new IssuesMonitor();

    monitor.init({ longTasks: { thresholdMs: 70 }, longAnimationFrames: false, webVitals: false }, onIssue);
    const observer = MockPerformanceObserver.byType('longtask');

    expect(observer).toBeDefined();

    observer!.emit([entry('longtask', 55)]);
    expect(onIssue).not.toHaveBeenCalled();

    observer!.emit([entry('longtask', 75)]);
    expect(onIssue).toHaveBeenCalledTimes(1);
    expect(onIssue.mock.calls[0][0].title).toContain('75 ms');
  });

  it('should ignore second init call and avoid duplicate observers', async () => {
    mockWebVitals();
    const { IssuesMonitor } = await import('../src/addons/issues');
    const monitor = new IssuesMonitor();
    const onIssue = vi.fn();

    monitor.init({ longTasks: {}, longAnimationFrames: {}, webVitals: false }, onIssue);
    monitor.init({ longTasks: {}, longAnimationFrames: {}, webVitals: false }, onIssue);

    expect(MockPerformanceObserver.instances).toHaveLength(2);
  });

  it('should disconnect and stop reporting after destroy', async () => {
    mockWebVitals();
    const { IssuesMonitor } = await import('../src/addons/issues');
    const onIssue = vi.fn();
    const monitor = new IssuesMonitor();

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
    const { IssuesMonitor } = await import('../src/addons/issues');
    const monitor = new IssuesMonitor();

    monitor.init({ longTasks: {}, longAnimationFrames: {}, webVitals: false }, vi.fn());

    expect(MockPerformanceObserver.instances).toHaveLength(0);
  });

  it('should report poor web vitals on timeout even when not all 5 metrics fired', async () => {
    vi.useFakeTimers();
    const webVitals = mockWebVitals();
    const { IssuesMonitor } = await import('../src/addons/issues');
    const onIssue = vi.fn();
    const monitor = new IssuesMonitor();

    monitor.init({ longTasks: false, longAnimationFrames: false, webVitals: true }, onIssue);
    await vi.dynamicImportSettled();

    webVitals.emit({ name: 'LCP', value: 5000, rating: 'poor', delta: 5000 });
    vi.advanceTimersByTime(10000);

    expect(onIssue).toHaveBeenCalledTimes(1);
    expect(onIssue.mock.calls[0][0].title).toContain('Poor Web Vitals');
    expect(onIssue.mock.calls[0][0].context).toHaveProperty('webVitals');
  });
});
