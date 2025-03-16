export interface Transaction {
  id: string;
  severity: 'default' | 'critical';
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: 'success' | 'failure';
  spans: Span[];
}

export interface AggregatedTransaction {
  aggregationId: string;
  name: string;
  avgStartTime: number;
  minStartTime: number;
  maxEndTime: number;
  p50duration: number;
  p95duration: number;
  maxDuration: number;
  count: number;
  aggregatedSpans: AggregatedSpan[];
}

export interface Span {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
}

export interface AggregatedSpan {
  aggregationId: string;
  name: string;
  minStartTime: number;
  maxEndTime: number;
  p50duration: number;
  p95duration: number;
  maxDuration: number;
}

export interface PerformanceMonitoringConfig {
  sampleRate: number;
  thresholdMs: number;
  criticalDurationThresholdMs: number;
}
