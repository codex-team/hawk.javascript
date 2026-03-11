import type { Json } from '@hawk.so/types';
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';
import type {
  PerformanceIssueEvent,
  PerformanceIssuesOptions,
  LoAFEntry,
  LoAFScript,
  LongTaskPerformanceEntry,
  WebVitalMetric
} from '../types/issues';
import { compactJson } from '../utils/compactJson';

/** Default threshold for Long Tasks detector (ms). */
export const DEFAULT_LONG_TASK_THRESHOLD_MS = 100;

/** Default threshold for Long Animation Frames detector (ms). */
export const DEFAULT_LOAF_THRESHOLD_MS = 300;

/** Global minimum threshold guard — prevents overly aggressive configuration and event spam. */
export const MIN_ISSUE_THRESHOLD_MS = 50;

/**
 * Checks whether a Long Task entry is worth reporting.
 *
 * Reportable when:
 * - duration >= threshold
 * - has at least one attribution with containerSrc, containerId, or containerName
 *
 * @param task - PerformanceLongTaskTiming entry from the observer
 * @param thresholdMs - minimum duration to consider the task reportable
 * @see https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming
 */
function isReportableLongTask(task: LongTaskPerformanceEntry, thresholdMs: number): boolean {
  if (Math.round(task.duration) < thresholdMs) {
    return false;
  }

  const primary = (task.attribution ?? [])[0];

  return !!primary && !!(primary.containerSrc || primary.containerId || primary.containerName);
}

/**
 * Checks whether a Long Animation Frame entry is worth reporting.
 *
 * Reportable when:
 * - duration >= threshold
 * - at least one script has sourceURL, sourceFunctionName, or invoker
 *
 * @param loaf - PerformanceLongAnimationFrameTiming entry from the observer
 * @param thresholdMs - minimum duration to consider the frame reportable
 * @see https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongAnimationFrameTiming
 */
function isReportableLoAF(loaf: LoAFEntry, thresholdMs: number): boolean {
  if (Math.round(loaf.duration) < thresholdMs) {
    return false;
  }

  return (loaf.scripts ?? []).some(
    (s) => s.sourceURL || s.sourceFunctionName || s.invoker
  );
}

/**
 * Checks whether a Web Vital metric should be reported.
 * Only poor-rated metrics are reported, and each metric name is reported at most once.
 *
 * @param metric - metric object from the web-vitals library
 * @param reported - set of already reported metric names (dedup guard)
 * @param metricName - metric name to check
 */
function isReportableWebVital(
  metric: { rating: string },
  reported: Set<string>,
  metricName: string
): boolean {
  return metric.rating === 'poor' && !reported.has(metricName);
}

/**
 * Builds a {@link PerformanceIssueEvent} from a Long Task entry.
 * Addon key: "Long Task".
 *
 * @param task - PerformanceLongTaskTiming entry (already validated)
 * @see https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming
 */
function serializeLongTaskEvent(task: LongTaskPerformanceEntry): PerformanceIssueEvent {
  const primary = task.attribution![0];
  const containerIdentifier = primary.containerSrc || primary.containerId || primary.containerName;

  return {
    title: 'Long Task — ' + containerIdentifier,
    addons: {
      'Long Task': compactJson([
        ['taskStartTimeMs', Math.round(task.startTime)],
        ['taskDurationMs', Math.round(task.duration)],
        ['attributionSourceType', primary.name],
        ['containerElementType', primary.containerType],
        ['containerSourceUrl', primary.containerSrc],
        ['containerElementId', primary.containerId],
        ['containerElementName', primary.containerName],
      ]),
    },
  };
}

/**
 * Builds a {@link PerformanceIssueEvent} from a Long Animation Frame entry.
 * Addon key: "Long Animation Frame".
 *
 * @param loaf - PerformanceLongAnimationFrameTiming entry (already validated)
 * @see https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongAnimationFrameTiming
 */
function serializeLoAFEvent(loaf: LoAFEntry): PerformanceIssueEvent {
  const scripts = (loaf.scripts ?? []).filter(
    (s) => s.sourceURL || s.sourceFunctionName || s.invoker
  );
  const topScript = scripts[0];
  const culprit = topScript?.sourceFunctionName
    || topScript?.invoker
    || topScript?.sourceURL
    || '';

  return {
    title: 'Long Animation Frame' + (culprit ? ` — ${culprit}` : ''),
    addons: {
      'Long Frame': compactJson([
        ['frameStartTimeMs', Math.round(loaf.startTime)],
        ['frameDurationMs', Math.round(loaf.duration)],
        ['frameBlockingDurationMs', loaf.blockingDuration != null ? Math.round(loaf.blockingDuration) : null],
        ['renderStartTimeMs', loaf.renderStart != null ? Math.round(loaf.renderStart) : null],
        ['styleAndLayoutStartTimeMs', loaf.styleAndLayoutStart != null ? Math.round(loaf.styleAndLayoutStart) : null],
        ['firstUIEventTimeMs', loaf.firstUIEventTimestamp != null ? Math.round(loaf.firstUIEventTimestamp) : null],
        ['scripts', scripts.reduce<Json>((acc, s, i) => {
          acc[`script_${i}`] = serializeScriptTiming(s);

          return acc;
        }, {})],
      ]),
    },
  };
}

/**
 * Builds a {@link PerformanceIssueEvent} from a poor Web Vital metric.
 * Addon key: "Web Vitals".
 *
 * @param metric - metric object from the web-vitals library
 */
function serializeWebVitalEvent(metric: WebVitalMetric): PerformanceIssueEvent {
  return {
    title: `Poor Web Vital: ${metric.name}`,
    addons: {
      'Web Vitals': compactJson([
        ['metricName', metric.name],
        ['metricValue', metric.value],
        ['metricRating', metric.rating],
        ['metricDelta', metric.delta],
        ['metricNavigationType', metric.navigationType],
      ]),
    },
  };
}

/**
 * Serializes a single PerformanceScriptTiming entry into a compact JSON payload.
 *
 * @param script - LoAF script timing entry
 * @see https://developer.mozilla.org/en-US/docs/Web/API/PerformanceScriptTiming
 */
function serializeScriptTiming(script: LoAFScript): Json {
  return compactJson([
    ['invokerName', script.invoker],
    ['invokerType', script.invokerType],
    ['sourceUrl', script.sourceURL],
    ['sourceFunctionName', script.sourceFunctionName],
    ['sourceCharPosition', script.sourceCharPosition != null && script.sourceCharPosition >= 0 ? script.sourceCharPosition : null],
    ['scriptStartTimeMs', Math.round(script.startTime)],
    ['scriptDurationMs', Math.round(script.duration)],
    ['executionStartTimeMs', script.executionStart != null ? Math.round(script.executionStart) : null],
    ['forcedStyleAndLayoutDurationMs', script.forcedStyleAndLayoutDuration != null ? Math.round(script.forcedStyleAndLayoutDuration) : null],
    ['pauseDurationMs', script.pauseDuration != null ? Math.round(script.pauseDuration) : null],
    ['windowAttribution', script.windowAttribution],
  ]);
}

/**
 * Performance issues monitor.
 *
 * Observes browser Performance API entries and Web Vitals metrics,
 * validates them against configured thresholds and filtering rules,
 * and emits structured {@link PerformanceIssueEvent} payloads.
 *
 * Supported detectors:
 * - **Long Tasks** — cross-origin / iframe tasks with identifiable container
 * - **Long Animation Frames** — frames with at least one identifiable script
 * - **Web Vitals** — poor-rated Core Web Vitals (LCP, FCP, TTFB, INP, CLS)
 */
export class PerformanceIssuesMonitor {
  private longTaskObserver: PerformanceObserver | null = null;
  private loafObserver: PerformanceObserver | null = null;
  private isInitialized = false;
  private destroyed = false;

  /**
   * Initializes enabled detectors based on the provided options.
   * Safe to call only once — subsequent calls are ignored until {@link destroy} resets the state.
   *
   * @param options - detector configuration (longTasks, longAnimationFrames, webVitals)
   * @param onIssue - callback invoked for each detected performance issue
   */
  public init(options: PerformanceIssuesOptions, onIssue: (event: PerformanceIssueEvent) => void): void {
    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;
    this.destroyed = false;

    const detectors = [
      {
        option: options.longTasks,
        type: 'longtask',
        defaultMs: DEFAULT_LONG_TASK_THRESHOLD_MS,
        process(entry: PerformanceEntry, ms: number): PerformanceIssueEvent | null {
          const task = entry as LongTaskPerformanceEntry;

          return isReportableLongTask(task, ms) ? serializeLongTaskEvent(task) : null;
        },
      },
      {
        option: options.longAnimationFrames,
        type: 'long-animation-frame',
        defaultMs: DEFAULT_LOAF_THRESHOLD_MS,
        process(entry: PerformanceEntry, ms: number): PerformanceIssueEvent | null {
          const loaf = entry as LoAFEntry;

          return isReportableLoAF(loaf, ms) ? serializeLoAFEvent(loaf) : null;
        },
      },
    ];

    [this.longTaskObserver, this.loafObserver] = detectors.map(({ option, type, defaultMs, process }) => {
      if (option === false) {
        return null;
      }

      const custom = typeof option === 'object' ? option?.thresholdMs : undefined;
      const thresholdMs = Math.max(MIN_ISSUE_THRESHOLD_MS,
        typeof custom === 'number' && !Number.isNaN(custom) ? Math.round(custom) : defaultMs);

      return this.observe(type, (entry) => {
        const event = process(entry, thresholdMs);

        if (event) {
          onIssue(event);
        }
      });
    });

    if (options.webVitals !== false) {
      this.observeWebVitals(onIssue);
    }
  }

  /**
   * Disconnects all active observers and resets the monitor state.
   * After calling destroy, the monitor can be re-initialized via {@link init}.
   */
  public destroy(): void {
    this.destroyed = true;
    this.isInitialized = false;
    this.longTaskObserver?.disconnect();
    this.loafObserver?.disconnect();
    this.longTaskObserver = null;
    this.loafObserver = null;
  }

  /**
   * Creates a PerformanceObserver for the given entry type.
   * Returns null if the browser does not support the entry type or the observer fails.
   *
   * @param type - performance entry type (e.g. "longtask", "long-animation-frame")
   * @param onEntry - callback invoked for each observed entry
   */
  private observe(type: string, onEntry: (entry: PerformanceEntry) => void): PerformanceObserver | null {
    if (!supportsEntryType(type)) {
      return null;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (this.destroyed) {
            return;
          }

          onEntry(entry);
        }
      });

      observer.observe({ type, buffered: true });

      return observer;
    } catch {
      return null;
    }
  }

  /**
   * Subscribes to Core Web Vitals via the web-vitals library.
   * Emits one issue per poor-rated metric; each metric name is reported at most once.
   *
   * @param onIssue - callback invoked for each poor metric
   */
  private observeWebVitals(onIssue: (event: PerformanceIssueEvent) => void): void {
    if (this.destroyed) {
      return;
    }

    const reported = new Set<string>();

    const report = (metric: WebVitalMetric): void => {
      if (this.destroyed || !isReportableWebVital(metric, reported, metric.name)) {
        return;
      }

      reported.add(metric.name);
      onIssue(serializeWebVitalEvent(metric));
    };

    onCLS(report);
    onINP(report);
    onLCP(report);
    onFCP(report);
    onTTFB(report);
  }
}

/**
 * Checks whether the browser supports a given performance entry type.
 *
 * @param type - entry type to check (e.g. "longtask", "long-animation-frame")
 */
function supportsEntryType(type: string): boolean {
  try {
    return (
      typeof PerformanceObserver !== 'undefined' &&
      typeof PerformanceObserver.supportedEntryTypes !== 'undefined' &&
      PerformanceObserver.supportedEntryTypes.includes(type)
    );
  } catch {
    return false;
  }
}
