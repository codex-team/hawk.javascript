/**
 * @file Web Vitals tracking — reports poor performance metrics as Hawk events
 */
import type { EventContext } from '@hawk.so/types';
import log from '../utils/log';

type WebVitalRating = 'good' | 'needs-improvement' | 'poor';

interface WebVitalsCallbacks {
  sendEvent: (message: string, context?: EventContext) => void;
}

const METRIC_THRESHOLDS: Record<string, [good: number, poor: number]> = {
  LCP: [2500, 4000],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
  INP: [200, 500],
  CLS: [0.1, 0.25],
};

/**
 * Tracks Core Web Vitals via the `web-vitals` library.
 * Sends a Hawk event with full metric context when a metric is rated `'poor'`.
 */
export class WebVitalsTracker {
  private readonly callbacks: WebVitalsCallbacks;

  constructor(callbacks: WebVitalsCallbacks) {
    this.callbacks = callbacks;
    this.init();
  }

  private init(): void {
    void import('web-vitals').then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
      onCLS((m) => this.handle(m));
      onINP((m) => this.handle(m));
      onLCP((m) => this.handle(m));
      onFCP((m) => this.handle(m));
      onTTFB((m) => this.handle(m));
    }).catch(() => {
      log(
        'web-vitals package is required for Web Vitals tracking. Install it with: npm i web-vitals',
        'warn',
      );
    });
  }

  private handle(metric: {
    name: string;
    value: number;
    rating: WebVitalRating;
    id: string;
    delta: number;
    navigationType: string;
  }): void {
    if (metric.rating !== 'poor') {
      return;
    }

    const { name, value, rating, id, delta, navigationType } = metric;
    const formatted = this.formatValue(name, value);
    const thresholds = METRIC_THRESHOLDS[name];
    const thresholdNote = thresholds
      ? `, threshold: ${this.formatValue(name, thresholds[1])}`
      : '';

    this.callbacks.sendEvent(
      `Poor Web Vital: ${name} = ${formatted} (${rating}${thresholdNote})`,
      {
        webVital: name,
        value,
        rating,
        delta,
        id,
        navigationType,
        url: location.href,
      },
    );
  }

  private formatValue(name: string, value: number): string {
    return name === 'CLS' ? value.toFixed(3) : `${Math.round(value)}ms`;
  }
}
