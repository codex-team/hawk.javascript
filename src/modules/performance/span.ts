import { id } from '../../utils/id';
import { getTimestamp } from '../../utils/get-timestamp';

interface SpanConstructionData {
  transactionId: string;
  name: string;
}

/**
 * Class representing a span of work within a transaction
 */
export class Span {
  public readonly id: string = id();
  public readonly transactionId: string;
  public readonly name: string;
  public readonly startTime: number = getTimestamp();
  public endTime?: number;
  public duration?: number;
  public readonly metadata?: Record<string, unknown>;
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
