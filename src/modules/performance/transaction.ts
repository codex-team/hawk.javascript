import { getTimestamp } from "../../utils/get-timestamp";
import PerformanceMonitoring from ".";
import { Span } from "./span";
import { id } from "../../utils/id";

export interface TransactionData {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, string>;
  spans: Span[];
}

/**
 * Class representing a transaction that can contain multiple spans
 */
export class Transaction {
  public readonly id: string;
  public readonly name: string;
  public readonly startTime: number;
  public endTime?: number;
  public duration?: number;
  public readonly tags: Record<string, string>;
  public readonly spans: Span[] = [];

  /**
   * Constructor for Transaction
   *
   * @param data - Data to initialize the transaction with. Contains id, name, startTime, tags
   * @param performance - Reference to the PerformanceMonitoring instance that created this transaction
   */
  constructor(
    data: TransactionData,
    private readonly performance: PerformanceMonitoring
  ) {
    this.id = data.id;
    this.name = data.name;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.duration = data.duration;
    this.tags = data.tags;
    this.spans = data.spans;
  }

  /**
   * Starts a new span within this transaction
   * 
   * @param name - Name of the span
   * @param metadata - Optional metadata to attach to the span
   * @returns New span instance
   */
  public startSpan(name: string, metadata?: Record<string, unknown>): Span {
    const data = {
      id: id(),
      transactionId: this.id,
      name,
      startTime: getTimestamp(),
      metadata,
    };

    const span = new Span(data);

    this.spans.push(span);

    return span;
  }

  /**
   *
   */
  public finish(): void {
    // Finish all unfinished spans
    this.spans.forEach(span => {
      if (!span.endTime) {
        span.finish();
      }
    });

    this.endTime = getTimestamp();
    this.duration = this.endTime - this.startTime;
    this.performance.queueTransaction(this);
  }

  /**
   * Returns transaction data that should be sent to server
   */
  public getData(): TransactionData {
    const { performance, ...data } = this;

    return data;
  }
}

/**
 * Class representing a sampled out transaction that won't be sent to server
 */
export class SampledOutTransaction extends Transaction {
  /**
   * Constructor for SampledOutTransaction
   *
   * @param data - Data to initialize the transaction with. Contains id, name, startTime, tags and spans
   */
  constructor(data: TransactionData) {
    super(data, null as unknown as PerformanceMonitoring);
  }


  /**
   * Finishes the transaction but does not send it to server since it was sampled out
   */
  public finish(): void {
    // Do nothing - don't send to server
  }
}
