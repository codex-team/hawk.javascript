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
  failureRate: number;
  aggregatedSpans: AggregatedSpan[];
}

export interface AggregatedSpan {
  aggregationId: string;
  name: string;
  minStartTime: number;
  maxEndTime: number;
  p50duration: number;
  p95duration: number;
  maxDuration: number;
  failureRate: number;
}

