import type { Json } from '@hawk.so/types';
import type {
  IssueEvent,
  IssuesOptions,
  LoAFEntry,
  LoAFScript,
  LongTaskPerformanceEntry,
  WebVitalMetric,
  WebVitalRating,
  WebVitalsReport,
} from '../types/issues';
import { compactJson } from '../utils/compactJson';
import log from '../utils/log';

const DEFAULT_LONG_TASK_THRESHOLD_MS = 100;
const DEFAULT_LOAF_THRESHOLD_MS = 500;

const METRIC_THRESHOLDS: Record<string, [good: number, poor: number]> = {
  LCP: [2500, 4000],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
  INP: [200, 500],
  CLS: [0.1, 0.25],
};

const TOTAL_WEB_VITALS = 5;

/**
 * Issues monitor handles:
 * - Long Tasks
 * - Long Animation Frames (LoAF)
 * - Aggregated Web Vitals report
 */
export class IssuesMonitor {
  private longTaskObserver: PerformanceObserver | null = null;
  private loafObserver: PerformanceObserver | null = null;
  private destroyed = false;

  /**
   * Initialize selected issue detectors.
   */
  public init(options: IssuesOptions, onIssue: (event: IssueEvent) => void): void {
    if (options.longTasks !== false) {
      this.observeLongTasks(
        resolveThreshold(options.longTasks?.thresholdMs, DEFAULT_LONG_TASK_THRESHOLD_MS),
        onIssue
      );
    }

    if (options.longAnimationFrames !== false) {
      this.observeLoAF(
        resolveThreshold(options.longAnimationFrames?.thresholdMs, DEFAULT_LOAF_THRESHOLD_MS),
        onIssue
      );
    }

    if (options.webVitals === true) {
      this.observeWebVitals(onIssue);
    }
  }

  /**
   * Cleanup active observers.
   */
  public destroy(): void {
    this.destroyed = true;
    this.longTaskObserver?.disconnect();
    this.loafObserver?.disconnect();
    this.longTaskObserver = null;
    this.loafObserver = null;
  }

  private observeLongTasks(thresholdMs: number, onIssue: (event: IssueEvent) => void): void {
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

      this.longTaskObserver.observe({ type: 'longtask', buffered: true });
    } catch {
      this.longTaskObserver = null;
    }
  }

  private observeLoAF(thresholdMs: number, onIssue: (event: IssueEvent) => void): void {
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

      this.loafObserver.observe({ type: 'long-animation-frame', buffered: true });
    } catch {
      this.loafObserver = null;
    }
  }

  private observeWebVitals(onIssue: (event: IssueEvent) => void): void {
    void import('web-vitals').then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
      const collected: WebVitalMetric[] = [];
      let reported = false;

      const tryReport = (): void => {
        if (this.destroyed || reported || collected.length < TOTAL_WEB_VITALS) {
          return;
        }

        reported = true;

        const poor = collected.filter((metric) => metric.rating === 'poor');

        if (poor.length === 0) {
          return;
        }

        const summary = poor
          .map((metric) => {
            const thresholds = METRIC_THRESHOLDS[metric.name];
            const threshold = thresholds ? ` (poor > ${formatValue(metric.name, thresholds[1])})` : '';

            return `${metric.name} = ${formatValue(metric.name, metric.value)}${threshold}`;
          })
          .join(', ');

        const report: WebVitalsReport = {
          summary,
          poorCount: poor.length,
          metrics: collected.reduce<Record<string, WebVitalMetric>>((acc, metric) => {
            acc[metric.name] = metric;

            return acc;
          }, {}),
        };

        onIssue({
          title: `Poor Web Vitals: ${summary}`,
          context: {
            webVitals: serializeWebVitalsReport(report),
          },
        });
      };

      const collect = (metric: { name: string; value: number; rating: WebVitalRating; delta: number }): void => {
        if (this.destroyed || reported) {
          return;
        }

        collected.push({
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
        });

        tryReport();
      };

      onCLS(collect);
      onINP(collect);
      onLCP(collect);
      onFCP(collect);
      onTTFB(collect);
    }).catch(() => {
      log(
        'web-vitals package is required for Web Vitals tracking. Install it with: npm i web-vitals',
        'warn'
      );
    });
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

function resolveThreshold(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(0, Math.round(value));
}

function formatValue(name: string, value: number): string {
  return name === 'CLS' ? value.toFixed(3) : `${Math.round(value)}ms`;
}

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

function serializeWebVitalsReport(report: WebVitalsReport): Json {
  const metrics = Object.entries(report.metrics).reduce<Json>((acc, [name, metric]) => {
    acc[name] = compactJson([
      ['name', metric.name],
      ['value', metric.value],
      ['rating', metric.rating],
      ['delta', metric.delta],
    ]);

    return acc;
  }, {});

  return compactJson([
    ['summary', report.summary],
    ['poorCount', report.poorCount],
    ['metrics', metrics],
  ]);
}
