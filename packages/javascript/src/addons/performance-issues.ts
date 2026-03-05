import type { Json } from '@hawk.so/types';
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';
import type {
  PerformanceIssueEvent,
  PerformanceIssuesOptions,
  LoAFEntry,
  LoAFScript,
  LongTaskPerformanceEntry,
  WebVitalMetric,
  WebVitalRating
} from '../types/issues';
import { compactJson } from '../utils/compactJson';

/**
 * Default threshold for Long Tasks detector.
 * Used when detector is enabled without a valid custom threshold.
 */
export const DEFAULT_LONG_TASK_THRESHOLD_MS = 70;
/**
 * Default threshold for Long Animation Frames detector.
 * Used when detector is enabled without a valid custom threshold.
 */
export const DEFAULT_LOAF_THRESHOLD_MS = 200;
/**
 * Global minimum threshold guard for freeze detectors.
 * Prevents overly aggressive configuration and event spam.
 */
export const MIN_ISSUE_THRESHOLD_MS = 50;
/**
 * Web Vitals "good/poor" boundaries used to enrich issue summaries.
 */
const METRIC_THRESHOLDS: Record<string, [good: number, poor: number]> = {
  LCP: [2500, 4000],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
  INP: [200, 500],
  CLS: [0.1, 0.25],
};

/**
 * Performance issues monitor handles:
 * - Long Tasks
 * - Long Animation Frames (LoAF)
 * - Aggregated Web Vitals report
 */
export class PerformanceIssuesMonitor {
  /** Active observer for Long Tasks API. */
  private longTaskObserver: PerformanceObserver | null = null;
  /** Active observer for Long Animation Frames API. */
  private loafObserver: PerformanceObserver | null = null;
  /** Prevents duplicate initialization and duplicate issue streams. */
  private isInitialized = false;
  /** Marks monitor as stopped to ignore async callbacks after destroy. */
  private destroyed = false;

  /**
   * Initialize selected issue detectors.
   *
   * @param options detectors config
   * @param onIssue issue callback
   */
  public init(options: PerformanceIssuesOptions, onIssue: (event: PerformanceIssueEvent) => void): void {
    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;
    this.destroyed = false;

    if (options.longTasks !== false) {
      this.observeLongTasks(
        resolveThreshold(resolveThresholdOption(options.longTasks), DEFAULT_LONG_TASK_THRESHOLD_MS),
        onIssue
      );
    }

    if (options.longAnimationFrames !== false) {
      this.observeLoAF(
        resolveThreshold(resolveThresholdOption(options.longAnimationFrames), DEFAULT_LOAF_THRESHOLD_MS),
        onIssue
      );
    }

    if (options.webVitals !== false) {
      this.observeWebVitals(onIssue);
    }
  }

  /**
   * Cleanup active observers.
   *
   * `isInitialized` controls re-initialization guard.
   * `destroyed` prevents any late async callback from emitting issues.
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
   * Observe Long Tasks and emit performance issues above threshold.
   *
   * @param thresholdMs max allowed duration
   * @param onIssue issue callback
   */
  private observeLongTasks(thresholdMs: number, onIssue: (event: PerformanceIssueEvent) => void): void {
    if (!supportsEntryType('longtask')) {
      return;
    }

    try {
      this.longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (this.destroyed) {
            return;
          }

          const task = entry as LongTaskPerformanceEntry;
          const durationMs = Math.round(task.duration);
          const attr = task.attribution?.[0];

          if (durationMs < thresholdMs) {
            continue;
          }

          const details = compactJson([
            ['kind', 'longtask'],
            ['entryName', task.name],
            ['startTime', Math.round(task.startTime)],
            ['durationMs', durationMs],
            ['containerType', attr?.containerType],
            ['containerSrc', attr?.containerSrc],
            ['containerId', attr?.containerId],
            ['containerName', attr?.containerName],
          ]);

          onIssue({
            title: `Long Task ${durationMs} ms`,
            context: { freezeDetection: details },
          });
        }
      });

      this.longTaskObserver.observe({ type: 'longtask',
        buffered: true });
    } catch {
      this.longTaskObserver = null;
    }
  }

  /**
   * Observe Long Animation Frames and emit performance issues above threshold.
   *
   * @param thresholdMs max allowed duration
   * @param onIssue issue callback
   */
  private observeLoAF(thresholdMs: number, onIssue: (event: PerformanceIssueEvent) => void): void {
    if (!supportsEntryType('long-animation-frame')) {
      return;
    }

    try {
      this.loafObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (this.destroyed) {
            return;
          }

          const loaf = entry as LoAFEntry;
          const durationMs = Math.round(loaf.duration);

          if (durationMs < thresholdMs) {
            continue;
          }

          const blockingDurationMs = loaf.blockingDuration !== undefined && loaf.blockingDuration !== null
            ? Math.round(loaf.blockingDuration)
            : null;

          const relevantScripts = loaf.scripts?.filter((s) => s.sourceURL || s.sourceFunctionName) ?? [];
          const scripts = relevantScripts.length
            ? relevantScripts.reduce<Json>((acc, script, i) => {
              acc[`script_${i}`] = serializeScript(script);

              return acc;
            }, {})
            : null;

          const details = compactJson([
            ['kind', 'loaf'],
            ['startTime', Math.round(loaf.startTime)],
            ['durationMs', durationMs],
            ['blockingDurationMs', blockingDurationMs],
            ['renderStart', loaf.renderStart != null ? Math.round(loaf.renderStart) : null],
            ['styleAndLayoutStart', loaf.styleAndLayoutStart != null ? Math.round(loaf.styleAndLayoutStart) : null],
            ['firstUIEventTimestamp', loaf.firstUIEventTimestamp != null ? Math.round(loaf.firstUIEventTimestamp) : null],
            ['scripts', scripts],
          ]);

          const blockingNote = blockingDurationMs !== null
            ? ` (blocking ${blockingDurationMs} ms)`
            : '';

          const topScript = relevantScripts[0];
          const culprit = topScript?.sourceFunctionName
            || topScript?.invoker
            || topScript?.sourceURL
            || '';
          const culpritNote = culprit ? ` — ${culprit}` : '';

          onIssue({
            title: `Long Animation Frame ${durationMs} ms${blockingNote}${culpritNote}`,
            context: { freezeDetection: details },
          });
        }
      });

      this.loafObserver.observe({ type: 'long-animation-frame',
        buffered: true });
    } catch {
      this.loafObserver = null;
    }
  }

  /**
   * Observe Web Vitals and emit one issue per poor metric.
   *
   * @param onIssue issue callback
   */
  private observeWebVitals(onIssue: (event: PerformanceIssueEvent) => void): void {
    if (this.destroyed) {
      return;
    }

    const reportedPoorMetrics = new Set<string>();

    /**
     * Emits one issue event for a poor metric.
     * Same metric name is reported only once.
     */
    const reportPoorMetric = (metric: { name: string; value: number; rating: WebVitalRating; delta: number }): void => {
      if (this.destroyed || metric.rating !== 'poor') {
        return;
      }

      if (reportedPoorMetrics.has(metric.name)) {
        return;
      }

      reportedPoorMetrics.add(metric.name);

      const thresholds = METRIC_THRESHOLDS[metric.name];
      const thresholdNote = thresholds ? ` (poor > ${formatValue(metric.name, thresholds[1])})` : '';
      const summary = `${metric.name} = ${formatValue(metric.name, metric.value)}${thresholdNote}`;

      onIssue({
        title: `Poor Web Vital: ${summary}`,
        context: {
          webVitals: serializeWebVitalMetric(metric),
        },
      });
    };

    onCLS(reportPoorMetric);
    onINP(reportPoorMetric);
    onLCP(reportPoorMetric);
    onFCP(reportPoorMetric);
    onTTFB(reportPoorMetric);
  }
}

/**
 * Checks if browser supports a performance entry type.
 *
 * @param type performance entry type
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

/**
 * Resolves threshold from user input and applies global minimum clamp.
 *
 * @param value custom threshold
 * @param fallback default threshold
 */
function resolveThreshold(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return Math.max(MIN_ISSUE_THRESHOLD_MS, fallback);
  }

  return Math.max(MIN_ISSUE_THRESHOLD_MS, Math.round(value));
}

/**
 * Returns custom threshold from detector config object.
 * Boolean options use default threshold.
 *
 * @param value detector config value
 */
function resolveThresholdOption(value: boolean | { thresholdMs?: number } | undefined): number | undefined {
  if (typeof value === 'object' && value !== null) {
    return value.thresholdMs;
  }

  return undefined;
}

/**
 * Formats Web Vitals metric value for readable summary.
 *
 * @param name metric name
 * @param value metric value
 */
function formatValue(name: string, value: number): string {
  return name === 'CLS' ? value.toFixed(3) : `${Math.round(value)}ms`;
}

/**
 * Serializes LoAF script timing into compact JSON payload.
 *
 * @param script loaf script entry
 */
function serializeScript(script: LoAFScript): Json {
  return compactJson([
    ['invoker', script.invoker],
    ['invokerType', script.invokerType],
    ['sourceURL', script.sourceURL],
    ['sourceFunctionName', script.sourceFunctionName],
    ['sourceCharPosition', script.sourceCharPosition != null && script.sourceCharPosition >= 0 ? script.sourceCharPosition : null],
    ['duration', Math.round(script.duration)],
    ['executionStart', script.executionStart != null ? Math.round(script.executionStart) : null],
    ['forcedStyleAndLayoutDuration', script.forcedStyleAndLayoutDuration != null ? Math.round(script.forcedStyleAndLayoutDuration) : null],
    ['pauseDuration', script.pauseDuration != null ? Math.round(script.pauseDuration) : null],
    ['windowAttribution', script.windowAttribution],
  ]);
}

/**
 * Serializes single Web Vital metric into event context payload.
 *
 * @param metric web vital metric
 */
function serializeWebVitalMetric(metric: WebVitalMetric): Json {
  return compactJson([
    ['name', metric.name],
    ['value', metric.value],
    ['rating', metric.rating],
    ['delta', metric.delta],
  ]);
}
