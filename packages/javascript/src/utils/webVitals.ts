/**
 * @file Web Vitals check — collects metrics and reports poor ones via callback
 */
import { log } from '@hawk.so/core';

type WebVitalRating = 'good' | 'needs-improvement' | 'poor';

export interface WebVitalMetric {
  name: string;
  value: number;
  rating: WebVitalRating;
  delta: number;
}

export interface WebVitalsReport {
  summary: string;
  poorCount: number;
  metrics: Record<string, WebVitalMetric>;
}

const METRIC_THRESHOLDS: Record<string, [good: number, poor: number]> = {
  LCP: [2500, 4000],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
  INP: [200, 500],
  CLS: [0.1, 0.25],
};

const TOTAL_METRICS = 5;

function formatValue(name: string, value: number): string {
  return name === 'CLS' ? value.toFixed(3) : `${Math.round(value)}ms`;
}

/**
 * Collects all Core Web Vitals. Calls back with a report only if
 * at least one metric is rated "poor". Does nothing if all are good.
 *
 * @param sendReport - called once with poor metrics report
 */
export function checkWebVitals(sendReport: (report: WebVitalsReport) => void): void {
  void import('web-vitals').then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
    const collected: WebVitalMetric[] = [];
    let reported = false;

    function tryReport(): void {
      if (reported || collected.length < TOTAL_METRICS) {
        return;
      }

      reported = true;

      const poor = collected.filter((m) => m.rating === 'poor');

      if (poor.length === 0) {
        return;
      }

      const summary = poor
        .map((m) => {
          const thresholds = METRIC_THRESHOLDS[m.name];
          const threshold = thresholds ? ` (poor > ${formatValue(m.name, thresholds[1])})` : '';

          return `${m.name} = ${formatValue(m.name, m.value)}${threshold}`;
        })
        .join(', ');

      const metrics: Record<string, WebVitalMetric> = {};

      for (const m of collected) {
        metrics[m.name] = m;
      }

      sendReport({ summary, poorCount: poor.length, metrics });
    }

    function collect(metric: { name: string; value: number; rating: WebVitalRating; delta: number }): void {
      collected.push({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
      });
      tryReport();
    }

    onCLS((m) => collect(m));
    onINP((m) => collect(m));
    onLCP((m) => collect(m));
    onFCP((m) => collect(m));
    onTTFB((m) => collect(m));
  }).catch(() => {
    log(
      'web-vitals package is required for Web Vitals tracking. Install it with: npm i web-vitals',
      'warn',
    );
  });
}
