/**
 * Interface for Span data
 */
export interface Span {
  /**
   * Unique identifier of the span
   */
  id: string;

  /**
   * ID of the parent transaction
   */
  transactionId: string;

  /**
   * Name of the span (e.g., 'db-query', 'http-request')
   */
  name: string;

  /**
   * Timestamp when the span started
   */
  startTime: number;

  /**
   * Timestamp when the span ended
   */
  endTime?: number;

  /**
   * Total duration of the span in milliseconds
   */
  duration?: number;

  /**
   * Additional context data for the span
   */
  metadata?: Record<string, any>;
} 
