import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Metric, ReportCallback } from 'web-vitals';
import {
  DEFAULT_LONG_TASK_THRESHOLD_MS,
  MIN_ISSUE_THRESHOLD_MS,
} from '../src/addons/performance-issues';

const webVitalsCallbacks: Record<string, ReportCallback | undefined> = {};

vi.mock('web-vitals', () => ({
  onCLS: (cb: ReportCallback) => { webVitalsCallbacks.CLS = cb; },
  onINP: (cb: ReportCallback) => { webVitalsCallbacks.INP = cb; },
  onLCP: (cb: ReportCallback) => { webVitalsCallbacks.LCP = cb; },
  onFCP: (cb: ReportCallback) => { webVitalsCallbacks.FCP = cb; },
  onTTFB: (cb: ReportCallback) => { webVitalsCallbacks.TTFB = cb; },
}));

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

/**
 * Creates a long task entry with cross-origin attribution (passes new filter).
 */
function longTaskEntry(duration: number, attribution?: { name?: string; containerSrc?: string; containerId?: string; containerName?: string }): PerformanceEntry {
  const attr = {
    name: attribution?.name ?? 'same-origin-ancestor',
    containerSrc: attribution?.containerSrc ?? 'https://example.com/frame.js',
    containerId: attribution?.containerId,
    containerName: attribution?.containerName,
  };

  return {
    startTime: 100,
    duration,
    attribution: [attr],
  } as unknown as PerformanceEntry;
}

/**
 * Creates a LoAF entry with at least one identifiable script (passes new filter).
 */
function loafEntry(duration: number, scripts?: Array<{ sourceURL?: string; sourceFunctionName?: string; invoker?: string; duration?: number; startTime?: number }>): PerformanceEntry {
  const defaultScripts = scripts ?? [{
    sourceURL: 'https://example.com/app.js',
    sourceFunctionName: 'handleClick',
    invoker: 'DOMWindow.onclick',
    duration: duration * 0.8,
    startTime: 100,
  }];

  return {
    startTime: 100,
    duration,
    blockingDuration: 0,
    renderStart: 120,
    styleAndLayoutStart: 130,
    firstUIEventTimestamp: 0,
    scripts: defaultScripts,
  } as unknown as PerformanceEntry;
}

function mockWebVitals() {
  return {
    emit(metric: Metric): void {
      webVitalsCallbacks[metric.name]?.(metric);
    },
  };
}

describe('PerformanceIssuesMonitor', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
    webVitalsCallbacks.CLS = undefined;
    webVitalsCallbacks.INP = undefined;
    webVitalsCallbacks.LCP = undefined;
    webVitalsCallbacks.FCP = undefined;
    webVitalsCallbacks.TTFB = undefined;
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
    const { PerformanceIssuesMonitor } = await import('../src/addons/performance-issues');
    const onIssue = vi.fn();
    const monitor = new PerformanceIssuesMonitor();

    monitor.init({ longTasks: { thresholdMs: 1 }, longAnimationFrames: false, webVitals: false }, onIssue);
    const observer = MockPerformanceObserver.byType('longtask');

    expect(observer).toBeDefined();

    observer!.emit([longTaskEntry(MIN_ISSUE_THRESHOLD_MS - 1)]);
    expect(onIssue).not.toHaveBeenCalled();

    observer!.emit([longTaskEntry(MIN_ISSUE_THRESHOLD_MS)]);
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

    observer!.emit([longTaskEntry(customThresholdMs - 1)]);
    expect(onIssue).not.toHaveBeenCalled();

    observer!.emit([longTaskEntry(customThresholdMs)]);
    expect(onIssue).toHaveBeenCalledTimes(1);
    expect(onIssue.mock.calls[0][0].title).toContain('Long Task');
    expect(onIssue.mock.calls[0][0].addons).toHaveProperty('Long Task');
    expect(onIssue.mock.calls[0][0].addons['Long Task']).toHaveProperty('taskDurationMs', customThresholdMs);
    expect(onIssue.mock.calls[0][0].addons['Long Task']).toHaveProperty('attributionSourceType', 'same-origin-ancestor');
  });

  it('should skip long tasks with name=self (no container info)', async () => {
    mockWebVitals();
    const { PerformanceIssuesMonitor } = await import('../src/addons/performance-issues');
    const onIssue = vi.fn();
    const monitor = new PerformanceIssuesMonitor();

    monitor.init({ longTasks: { thresholdMs: 50 }, longAnimationFrames: false, webVitals: false }, onIssue);
    const observer = MockPerformanceObserver.byType('longtask');

    observer!.emit([longTaskEntry(120, { name: 'self', containerSrc: '' })]);
    expect(onIssue).not.toHaveBeenCalled();
  });

  it('should skip long tasks without container identifier', async () => {
    mockWebVitals();
    const { PerformanceIssuesMonitor } = await import('../src/addons/performance-issues');
    const onIssue = vi.fn();
    const monitor = new PerformanceIssuesMonitor();

    monitor.init({ longTasks: { thresholdMs: 50 }, longAnimationFrames: false, webVitals: false }, onIssue);
    const observer = MockPerformanceObserver.byType('longtask');

    observer!.emit([longTaskEntry(120, { name: 'cross-origin-ancestor' })]);
    expect(onIssue).not.toHaveBeenCalled();
  });

  it('should use default threshold when longTasks is true', async () => {
    mockWebVitals();
    const { PerformanceIssuesMonitor } = await import('../src/addons/performance-issues');
    const onIssue = vi.fn();
    const monitor = new PerformanceIssuesMonitor();

    monitor.init({ longTasks: true, longAnimationFrames: false, webVitals: false }, onIssue);
    const observer = MockPerformanceObserver.byType('longtask');

    expect(observer).toBeDefined();

    observer!.emit([longTaskEntry(DEFAULT_LONG_TASK_THRESHOLD_MS - 1)]);
    expect(onIssue).not.toHaveBeenCalled();

    observer!.emit([longTaskEntry(DEFAULT_LONG_TASK_THRESHOLD_MS)]);
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

    observer!.emit([longTaskEntry(120)]);
    expect(onIssue).toHaveBeenCalledTimes(1);

    monitor.destroy();
    expect(observer!.disconnected).toBe(true);

    observer!.emit([longTaskEntry(130)]);
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

  it('should emit LoAF issue only when scripts have identifiable source', async () => {
    mockWebVitals();
    const { PerformanceIssuesMonitor } = await import('../src/addons/performance-issues');
    const onIssue = vi.fn();
    const monitor = new PerformanceIssuesMonitor();

    monitor.init({ longTasks: false, longAnimationFrames: { thresholdMs: 50 }, webVitals: false }, onIssue);
    const observer = MockPerformanceObserver.byType('long-animation-frame');

    observer!.emit([loafEntry(250, [{ duration: 200, startTime: 100 }])]);
    expect(onIssue).not.toHaveBeenCalled();

    observer!.emit([loafEntry(250)]);
    expect(onIssue).toHaveBeenCalledTimes(1);
    expect(onIssue.mock.calls[0][0].addons).toHaveProperty('Long Animation Frame');
    expect(onIssue.mock.calls[0][0].addons['Long Animation Frame']).toHaveProperty('frameDurationMs', 250);
  });

  it('should report poor web vital metric in addons', async () => {
    const webVitals = mockWebVitals();
    const { PerformanceIssuesMonitor } = await import('../src/addons/performance-issues');
    const onIssue = vi.fn();
    const monitor = new PerformanceIssuesMonitor();

    monitor.init({ longTasks: false, longAnimationFrames: false, webVitals: true }, onIssue);
    await vi.dynamicImportSettled();

    webVitals.emit({ name: 'LCP', value: 5000, rating: 'poor', delta: 5000 });

    expect(onIssue).toHaveBeenCalledTimes(1);
    expect(onIssue.mock.calls[0][0].title).toContain('Poor Web Vital');
    expect(onIssue.mock.calls[0][0].addons).toHaveProperty('Web Vitals');
    expect(onIssue.mock.calls[0][0].addons['Web Vitals']).toHaveProperty('metricName', 'LCP');
  });

  it('should report poor INP metric', async () => {
    const webVitals = mockWebVitals();
    const { PerformanceIssuesMonitor } = await import('../src/addons/performance-issues');
    const onIssue = vi.fn();
    const monitor = new PerformanceIssuesMonitor();

    monitor.init({ longTasks: false, longAnimationFrames: false, webVitals: true }, onIssue);
    await vi.dynamicImportSettled();

    webVitals.emit({ name: 'INP', value: 600, rating: 'poor', delta: 600 });

    expect(onIssue).toHaveBeenCalledTimes(1);
    expect(onIssue.mock.calls[0][0].title).toContain('Poor Web Vital');
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
