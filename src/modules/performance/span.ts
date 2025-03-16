import { id } from '../../utils/id';
import { getTimestamp } from '../../utils/get-timestamp';
/**
 * Interface for data required to construct a Span
 */
interface SpanConstructionData {
  /**
   * ID of the transaction this span belongs to
   */
  transactionId: string;

  /**
   * Name of the span
   */
  name: string;
}

/**
 * Class representing a span of work within a transaction
 */
export class Span {
  /**
   * Unique identifier for this span
   */
  public readonly id: string = id();

  /**
   * ID of the transaction this span belongs to
   */
  public readonly transactionId: string;

  /**
   * Name of the span
   */
  public readonly name: string;

  /**
   * Timestamp when the span started
   */
  public readonly startTime: number = getTimestamp();

  /**
   * Timestamp when the span ended
   */
  public endTime?: number;

  /**
   * Duration of the span in milliseconds
   */
  public duration?: number;

  /**
   * Status indicating whether the span completed successfully or failed
   */
  public status: 'success' | 'failure' = 'success';

  /**
   * Constructor for Span
   *
   * @param data - Data to initialize the span with. Contains id, transactionId, name, startTime, metadata
   */
  constructor(data: SpanConstructionData) {
    this.transactionId = data.transactionId;
    this.name = data.name;
  }

  /**
   * Finishes the span and calculates its duration
   *
   * @param status - Status of the span ('success' or 'failure'). Defaults to 'success'
   */
  public finish(status: 'success' | 'failure' = 'success'): void {
    this.endTime = getTimestamp();
    this.duration = this.endTime - this.startTime;
    this.status = status;
  }
}
