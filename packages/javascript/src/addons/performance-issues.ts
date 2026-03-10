import type { Json } from '@hawk.so/types';
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';
import type {
  PerformanceIssueEvent,
  PerformanceIssuesOptions,
  LoAFEntry,
  LoAFScript,
  LongTaskAttribution,
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
          const attributions = task.attribution ?? [];
          const primaryAttribution = attributions[0];

          if (durationMs < thresholdMs) {
            continue;
          }

          const culprit = resolveLongTaskCulprit(primaryAttribution);

          const details = compactJson([
            ['kind', 'longtask'],
            ['entryName', task.name],
            ['entryType', task.entryType],
            ['startTime', Math.round(task.startTime)],
            ['durationMs', durationMs],
            ['attributionCount', attributions.length || null],
            ['attributions', serializeLongTaskAttributions(attributions)],
            ['culprit', culprit],
          ]);

          onIssue({
            title: 'Long Task' + (culprit ? ` — ${culprit}` : ''),
            context: { longTask: details },
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
          const topScript = relevantScripts[0];
          const maxScriptDurationMs = topScript ? Math.round(topScript.duration) : null;
          const totalScriptDurationMs = relevantScripts.length
            ? Math.round(relevantScripts.reduce((total, script) => total + script.duration, 0))
            : null;
          const topScriptName = topScript?.sourceFunctionName
            || topScript?.name
            || topScript?.invoker
            || topScript?.sourceURL
            || null;
          const topScriptUrl = topScript?.sourceURL ?? null;

          const details = compactJson([
            ['kind', 'loaf'],
            ['entryName', loaf.name],
            ['entryType', loaf.entryType],
            ['startTime', Math.round(loaf.startTime)],
            ['durationMs', durationMs],
            ['blockingDurationMs', blockingDurationMs],
            ['desiredRenderStart', loaf.desiredRenderStart != null ? Math.round(loaf.desiredRenderStart) : null],
            ['renderStart', loaf.renderStart != null ? Math.round(loaf.renderStart) : null],
            ['styleAndLayoutStart', loaf.styleAndLayoutStart != null ? Math.round(loaf.styleAndLayoutStart) : null],
            ['firstUIEventTimestamp', loaf.firstUIEventTimestamp != null ? Math.round(loaf.firstUIEventTimestamp) : null],
            ['scriptsCount', relevantScripts.length || null],
            ['maxScriptDurationMs', maxScriptDurationMs],
            ['totalScriptDurationMs', totalScriptDurationMs],
            ['topScriptName', topScriptName],
            ['topScriptUrl', topScriptUrl],
            ['scripts', scripts],
          ]);

          const culprit = topScript?.sourceFunctionName
            || topScript?.invoker
            || topScript?.sourceURL
            || '';

          onIssue({
            title: 'Long Animation Frame' + (culprit ? ` — ${culprit}` : ''),
            context: { loaf: details },
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

      onIssue({
        title: `Poor Web Vital: ${metric.name}`,
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
 * Serializes LoAF script timing into compact JSON payload.
 *
 * @param script loaf script entry
 */
function serializeScript(script: LoAFScript): Json {
  return compactJson([
    ['name', script.name],
    ['invoker', script.invoker],
    ['invokerType', script.invokerType],
    ['sourceURL', script.sourceURL],
    ['sourceFunctionName', script.sourceFunctionName],
    ['sourceCharPosition', script.sourceCharPosition != null && script.sourceCharPosition >= 0 ? script.sourceCharPosition : null],
    ['startTime', Math.round(script.startTime)],
    ['duration', Math.round(script.duration)],
    ['executionStart', script.executionStart != null ? Math.round(script.executionStart) : null],
    ['forcedStyleAndLayoutDuration', script.forcedStyleAndLayoutDuration != null ? Math.round(script.forcedStyleAndLayoutDuration) : null],
    ['pauseDuration', script.pauseDuration != null ? Math.round(script.pauseDuration) : null],
    ['windowAttribution', script.windowAttribution],
  ]);
}

/**
 * Serializes long task attributions into compact JSON payload.
 *
 * @param attributions long task attribution entries
 */
function serializeLongTaskAttributions(attributions: LongTaskAttribution[]): Json | null {
  if (attributions.length === 0) {
    return null;
  }

  return attributions.reduce<Json>((acc, attribution, i) => {
    acc[`attribution_${i}`] = compactJson([
      ['name', attribution.name],
      ['entryType', attribution.entryType],
      ['startTime', attribution.startTime != null ? Math.round(attribution.startTime) : null],
      ['duration', attribution.duration != null ? Math.round(attribution.duration) : null],
      ['containerType', attribution.containerType],
      ['containerSrc', attribution.containerSrc],
      ['containerId', attribution.containerId],
      ['containerName', attribution.containerName],
    ]);

    return acc;
  }, {});
}

/**
 * Resolves readable culprit from long task attribution.
 *
 * @param attribution first attribution entry
 */
function resolveLongTaskCulprit(attribution: LongTaskAttribution | undefined): string | null {
  if (!attribution) {
    return null;
  }

  return attribution.containerSrc
    || attribution.containerId
    || attribution.containerName
    || attribution.name
    || null;
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
