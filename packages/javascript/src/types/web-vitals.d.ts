declare module 'web-vitals' {
  export interface Metric {
    name: string;
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    delta: number;
  }

  export type ReportCallback = (metric: Metric) => void;

  export function onCLS(callback: ReportCallback): void;
  export function onINP(callback: ReportCallback): void;
  export function onLCP(callback: ReportCallback): void;
  export function onFCP(callback: ReportCallback): void;
  export function onTTFB(callback: ReportCallback): void;
}
