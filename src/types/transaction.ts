import type { Span } from './span';

/**
 * Interface for Transaction data
 */
export interface Transaction {
  /**
   * Unique identifier of the transaction
   */
  id: string;

  /**
   * Identifier for grouping related transactions
   */
  traceId: string;

  /**
   * Name of the transaction (e.g., 'page-load', 'api-request')
   */
  name: string;

  /**
   * Timestamp when the transaction started
   */
  startTime: number;

  /**
   * Timestamp when the transaction ended
   */
  endTime?: number;

  /**
   * Total duration of the transaction in milliseconds
   */
  duration?: number;

  /**
   * Key-value pairs for additional transaction data
   */
  tags: Record<string, string>;

  /**
   * List of spans associated with this transaction
   */
  spans: Span[];
}
