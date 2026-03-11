import type { Json } from '@hawk.so/types';
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';
import type {
  PerformanceIssueEvent,
  PerformanceIssuesOptions,
  LoAFEntry,
  LoAFScript,
  LongTaskPerformanceEntry,
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
 * - Long Tasks (only cross-origin / iframe tasks with identifiable container)
 * - Long Animation Frames (only when at least one script has identifiable source)
 * - Web Vitals (poor metrics only)
 */
export class PerformanceIssuesMonitor {
  private longTaskObserver: PerformanceObserver | null = null;
  private loafObserver: PerformanceObserver | null = null;
  private isInitialized = false;
  private destroyed = false;

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

  public destroy(): void {
    this.destroyed = true;
    this.isInitialized = false;
    this.longTaskObserver?.disconnect();
    this.loafObserver?.disconnect();
    this.longTaskObserver = null;
    this.loafObserver = null;
  }

  /**
   * Long Tasks are only reported when the primary attribution points to
   * an identifiable external container (name !== "self") with at least
   * one of containerSrc / containerId / containerName.
   *
   * Removed always-constant fields: entryType ("longtask"), attribution entryType ("taskattribution").
   * @see https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming
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

          if (durationMs < thresholdMs) {
            continue;
          }

          const primary = (task.attribution ?? [])[0];

          if (!primary || primary.name === 'self') {
            continue;
          }

          const containerIdentifier = primary.containerSrc || primary.containerId || primary.containerName;

          if (!containerIdentifier) {
            continue;
          }

          const details = compactJson([
            ['taskStartTimeMs', Math.round(task.startTime)],
            ['taskDurationMs', durationMs],
            ['attributionSourceType', primary.name],
            ['containerElementType', primary.containerType],
            ['containerSourceUrl', primary.containerSrc],
            ['containerElementId', primary.containerId],
            ['containerElementName', primary.containerName],
          ]);

          onIssue({
            title: 'Long Task — ' + containerIdentifier,
            addons: { longTask: details },
          });
        }
      });

      this.longTaskObserver.observe({ type: 'longtask', buffered: true });
    } catch {
      this.longTaskObserver = null;
    }
  }

  /**
   * LoAF is only reported when at least one script has an identifiable source
   * (sourceURL, sourceFunctionName, or invoker).
   *
   * Removed always-constant fields: name ("long-animation-frame"), entryType ("long-animation-frame"),
   * script name ("script"). Removed derived summary fields (scriptsCount, topScript*, totals).
   * @see https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongAnimationFrameTiming
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

          const relevantScripts = loaf.scripts?.filter(
            (s) => s.sourceURL || s.sourceFunctionName || s.invoker
          ) ?? [];

          if (relevantScripts.length === 0) {
            continue;
          }

          const scripts = relevantScripts.reduce<Json>((acc, script, i) => {
            acc[`script_${i}`] = serializeScriptTiming(script);

            return acc;
          }, {});

          const details = compactJson([
            ['frameStartTimeMs', Math.round(loaf.startTime)],
            ['frameDurationMs', durationMs],
            ['frameBlockingDurationMs', positiveOrNull(loaf.blockingDuration)],
            ['renderStartTimeMs', loaf.renderStart != null ? Math.round(loaf.renderStart) : null],
            ['styleAndLayoutStartTimeMs', loaf.styleAndLayoutStart != null ? Math.round(loaf.styleAndLayoutStart) : null],
            ['firstUIEventTimeMs', positiveOrNull(loaf.firstUIEventTimestamp)],
            ['scripts', scripts],
          ]);

          const topScript = relevantScripts[0];
          const culprit = topScript?.sourceFunctionName
            || topScript?.invoker
            || topScript?.sourceURL
            || '';

          onIssue({
            title: 'Long Animation Frame' + (culprit ? ` — ${culprit}` : ''),
            addons: { longAnimationFrame: details },
          });
        }
      });

      this.loafObserver.observe({ type: 'long-animation-frame', buffered: true });
    } catch {
      this.loafObserver = null;
    }
  }

  private observeWebVitals(onIssue: (event: PerformanceIssueEvent) => void): void {
    if (this.destroyed) {
      return;
    }

    const reportedPoorMetrics = new Set<string>();

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
        addons: {
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
 * Returns rounded value only when > 0; otherwise null (stripped by compactJson).
 * Avoids sending noise like blockingDuration=0, pauseDuration=0, etc.
 */
function positiveOrNull(value: number | null | undefined): number | null {
  if (value == null || value <= 0) {
    return null;
  }

  return Math.round(value);
}

function resolveThreshold(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return Math.max(MIN_ISSUE_THRESHOLD_MS, fallback);
  }

  return Math.max(MIN_ISSUE_THRESHOLD_MS, Math.round(value));
}

function resolveThresholdOption(value: boolean | { thresholdMs?: number } | undefined): number | undefined {
  if (typeof value === 'object' && value !== null) {
    return value.thresholdMs;
  }

  return undefined;
}

/**
 * Serialize a PerformanceScriptTiming entry.
 * Removed always-constant `name` field (always "script").
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
    ['forcedStyleAndLayoutDurationMs', positiveOrNull(script.forcedStyleAndLayoutDuration)],
    ['pauseDurationMs', positiveOrNull(script.pauseDuration)],
    ['windowAttribution', script.windowAttribution],
  ]);
}

function serializeWebVitalMetric(metric: { name: string; value: number; rating: string; delta: number }): Json {
  return compactJson([
    ['metricName', metric.name],
    ['metricValue', metric.value],
    ['metricRating', metric.rating],
    ['metricDelta', metric.delta],
  ]);
}
