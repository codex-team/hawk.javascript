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
   * Finishes the span by setting the end time and calculating duration
   */
  public finish(): void {
    this.endTime = getTimestamp();
    this.duration = this.endTime - this.startTime;
  }
}
