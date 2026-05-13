import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Metric, ReportCallback } from 'web-vitals';
import {
  DEFAULT_LONG_TASK_THRESHOLD_MS,
  MIN_REPORTABLE_ISSUE_THRESHOLD_MS,
} from '../../src/addons/performance-issues';

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
    emit(metric: Pick<Metric, 'name' | 'value' | 'rating' | 'delta'> & Partial<Metric>): void {
      webVitalsCallbacks[metric.name]?.(metric as Metric);
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

  it.each([
    {
      title: 'clamp threshold to 50ms minimum',
      longTasks: { thresholdMs: 1 },
      expectedThresholdMs: MIN_REPORTABLE_ISSUE_THRESHOLD_MS,
    },
    {
      title: 'use default threshold for longTasks=true',
      longTasks: true,
      expectedThresholdMs: DEFAULT_LONG_TASK_THRESHOLD_MS,
    },
    {
      title: 'respect custom threshold',
      longTasks: { thresholdMs: 75 },
      expectedThresholdMs: 75,
    },
  ])('should $title', async ({ longTasks, expectedThresholdMs }) => {
    mockWebVitals();
    const { PerformanceIssuesMonitor } = await import('../../src/addons/performance-issues');
    const onIssue = vi.fn();
    const monitor = new PerformanceIssuesMonitor();

    monitor.init({ longTasks, longAnimationFrames: false, webVitals: false }, onIssue);
    const observer = MockPerformanceObserver.byType('longtask');

    expect(observer).toBeDefined();
    observer!.emit([longTaskEntry(expectedThresholdMs - 1)]);
    expect(onIssue).not.toHaveBeenCalled();

    observer!.emit([longTaskEntry(expectedThresholdMs)]);
    expect(onIssue).toHaveBeenCalledTimes(1);
    expect(onIssue.mock.calls[0][0].title).toContain('Long Task');
    expect(onIssue.mock.calls[0][0].addons).toHaveProperty('Long Task');
    expect(onIssue.mock.calls[0][0].addons['Long Task']).toHaveProperty('taskDurationMs', expectedThresholdMs);
    expect(onIssue.mock.calls[0][0].addons['Long Task']).toHaveProperty('attributionSourceType', 'same-origin-ancestor');
  });

  it('should skip observers when performance entry types are unsupported', async () => {
    MockPerformanceObserver.supportedEntryTypes = [];
    mockWebVitals();
    const { PerformanceIssuesMonitor } = await import('../../src/addons/performance-issues');
    const monitor = new PerformanceIssuesMonitor();

    monitor.init({ longTasks: {}, longAnimationFrames: {}, webVitals: false }, vi.fn());
    expect(MockPerformanceObserver.instances).toHaveLength(0);
  });

  it('should skip long tasks with name=self (no container info)', async () => {
    mockWebVitals();
    const { PerformanceIssuesMonitor } = await import('../../src/addons/performance-issues');
    const onIssue = vi.fn();
    const monitor = new PerformanceIssuesMonitor();

    monitor.init({ longTasks: { thresholdMs: 50 }, longAnimationFrames: false, webVitals: false }, onIssue);
    const observer = MockPerformanceObserver.byType('longtask');

    observer!.emit([longTaskEntry(120, { name: 'self', containerSrc: '' })]);
    expect(onIssue).not.toHaveBeenCalled();
  });

  it('should skip long tasks without container identifier', async () => {
    mockWebVitals();
    const { PerformanceIssuesMonitor } = await import('../../src/addons/performance-issues');
    const onIssue = vi.fn();
    const monitor = new PerformanceIssuesMonitor();

    monitor.init({ longTasks: { thresholdMs: 50 }, longAnimationFrames: false, webVitals: false }, onIssue);
    const observer = MockPerformanceObserver.byType('longtask');

    observer!.emit([longTaskEntry(120, { name: 'cross-origin-ancestor', containerSrc: '' })]);
    expect(onIssue).not.toHaveBeenCalled();
  });

  it('should emit LoAF issue only when scripts have identifiable source', async () => {
    mockWebVitals();
    const { PerformanceIssuesMonitor } = await import('../../src/addons/performance-issues');
    const onIssue = vi.fn();
    const monitor = new PerformanceIssuesMonitor();

    monitor.init({ longTasks: false, longAnimationFrames: { thresholdMs: 50 }, webVitals: false }, onIssue);
    const observer = MockPerformanceObserver.byType('long-animation-frame');

    observer!.emit([loafEntry(250, [{ duration: 200, startTime: 100 }])]);
    expect(onIssue).not.toHaveBeenCalled();

    observer!.emit([loafEntry(250)]);
    expect(onIssue).toHaveBeenCalledTimes(1);
    expect(onIssue.mock.calls[0][0].addons).toHaveProperty('Long Frame');
    expect(onIssue.mock.calls[0][0].addons['Long Frame']).toHaveProperty('frameDurationMs', 250);
  });

  it('should report poor web vital metric in addons', async () => {
    const webVitals = mockWebVitals();
    const { PerformanceIssuesMonitor } = await import('../../src/addons/performance-issues');
    const onIssue = vi.fn();
    const monitor = new PerformanceIssuesMonitor();

    monitor.init({ longTasks: false, longAnimationFrames: false, webVitals: true }, onIssue);
    await vi.dynamicImportSettled();

    webVitals.emit({ name: 'LCP', value: 5001, rating: 'poor', delta: 5001 });

    expect(onIssue).toHaveBeenCalledTimes(1);
    expect(onIssue.mock.calls[0][0].title).toContain('Poor Web Vital');
    expect(onIssue.mock.calls[0][0].addons).toHaveProperty('Web Vitals');
    expect(onIssue.mock.calls[0][0].addons['Web Vitals']).toHaveProperty('metricName', 'LCP');
  });

  it.each([
    {
      title: 'allow overriding web vitals reportPoorAbove threshold',
      webVitalsOption: { reportPoorAbove: { INP: 500 } },
      metric: { name: 'INP', value: 600, rating: 'poor', delta: 600 } as const,
      shouldReport: true,
    },
    {
      title: 'not report Web Vital when value equals reportPoorAbove threshold',
      webVitalsOption: true,
      metric: { name: 'LCP', value: 5000, rating: 'poor', delta: 5000 } as const,
      shouldReport: false,
    },
    {
      title: 'fallback to default threshold when custom reportPoorAbove is NaN',
      webVitalsOption: { reportPoorAbove: { INP: Number.NaN } },
      metric: { name: 'INP', value: 650, rating: 'poor', delta: 650 } as const,
      shouldReport: false,
    },
    {
      title: 'not subscribe to web vitals when webVitals is false',
      webVitalsOption: false,
      metric: { name: 'LCP', value: 9000, rating: 'poor', delta: 9000 } as const,
      shouldReport: false,
    },
  ])('should $title', async ({ webVitalsOption, metric, shouldReport }) => {
    const webVitals = mockWebVitals();
    const { PerformanceIssuesMonitor } = await import('../../src/addons/performance-issues');
    const onIssue = vi.fn();
    const monitor = new PerformanceIssuesMonitor();

    monitor.init({ longTasks: false, longAnimationFrames: false, webVitals: webVitalsOption }, onIssue);
    await vi.dynamicImportSettled();
    webVitals.emit(metric);

    if (shouldReport) {
      expect(onIssue).toHaveBeenCalledTimes(1);
    } else {
      expect(onIssue).not.toHaveBeenCalled();
    }
  });

  it('should not emit event for non-poor web vital metric', async () => {
    const webVitals = mockWebVitals();
    const { PerformanceIssuesMonitor } = await import('../../src/addons/performance-issues');
    const onIssue = vi.fn();
    const monitor = new PerformanceIssuesMonitor();

    monitor.init({ longTasks: false, longAnimationFrames: false, webVitals: true }, onIssue);
    await vi.dynamicImportSettled();

    webVitals.emit({ name: 'FCP', value: 1800, rating: 'good', delta: 1800 });
    expect(onIssue).not.toHaveBeenCalled();
  });

});
