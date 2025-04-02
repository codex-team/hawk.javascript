/**
 * Interface representing aggregated statistics for a group of transactions with the same name
 */
export interface AggregatedTransaction {
  /**
   * Unique identifier for this aggregation, combining name and timestamp
   */
  aggregationId: string;

  /**
   * Name of the transactions being aggregated
   */
  name: string;

  /**
   * Average start time across all transactions in the group
   */
  avgStartTime: number;

  /**
   * Earliest start time among all transactions in the group
   */
  minStartTime: number;

  /**
   * Latest end time among all transactions in the group
   */
  maxEndTime: number;

  /**
   * 50th percentile (median) duration across all transactions
   */
  p50duration: number;

  /**
   * 95th percentile duration across all transactions
   */
  p95duration: number;

  /**
   * Maximum duration among all transactions
   */
  maxDuration: number;

  /**
   * Total number of transactions in this group
   */
  count: number;

  /**
   * Percentage of transactions that failed
   */
  failureRate: number;

  /**
   * Array of aggregated statistics for spans within these transactions
   */
  aggregatedSpans: AggregatedSpan[];
}

/**
 * Interface representing aggregated statistics for a group of spans with the same name
 */
export interface AggregatedSpan {
  /**
   * Unique identifier for this span aggregation
   */
  aggregationId: string;

  /**
   * Name of the spans being aggregated
   */
  name: string;

  /**
   * Earliest start time among all spans in the group
   */
  minStartTime: number;

  /**
   * Latest end time among all spans in the group
   */
  maxEndTime: number;

  /**
   * 50th percentile (median) duration across all spans
   */
  p50duration: number;

  /**
   * 95th percentile duration across all spans
   */
  p95duration: number;

  /**
   * Maximum duration among all spans
   */
  maxDuration: number;

  /**
   * Percentage of spans that failed
   */
  failureRate: number;
}
