import { getTimestamp } from '../../utils/get-timestamp';
import type PerformanceMonitoring from '.';
import { Span } from './span';
import { id } from '../../utils/id';
import type { PerformanceMonitoringConfig } from './types';

/**
 * Interface representing data needed to construct a Transaction
 */
export interface TransactionConstructionData {
  /**
   * Name of the transaction (e.g. 'page-load', 'api-call')
   */
  name: string;

  /**
   * Severity level of the transaction
   * - 'default': Normal transaction that might be sampled out
   * - 'critical': High priority transaction that will be sent regardless of sampling rate
   */
  severity: 'default' | 'critical';
}

/**
 * Class representing a transaction that can contain multiple spans
 */
export class Transaction {
  public readonly id: string = id();
  public readonly name: string;
  public readonly startTime: number = getTimestamp();
  public endTime?: number;
  public duration?: number;
  public readonly spans: Span[] = [];
  public finishStatus: 'success' | 'failure' = 'success';
  private severity: 'default' | 'critical' = 'default';

  /**
   * Constructor for Transaction
   *
   * @param data - Data to initialize the transaction with. Contains id, name, startTime, tags
   * @param performance - Reference to the PerformanceMonitoring instance that created this transaction
   * @param config - Configuration for this transaction
   */
  constructor(
    data: TransactionConstructionData,
    private readonly performance: PerformanceMonitoring,
    private readonly config: PerformanceMonitoringConfig
  ) {
    this.name = data.name;
    this.severity = data.severity;
  }

  /**
   * Starts a new span within this transaction
   *
   * @param name - Name of the span
   * @param metadata - Optional metadata to attach to the span
   * @returns New span instance
   */
  public startSpan(name: string): Span {
    const data = {
      transactionId: this.id,
      name,
    };

    const span = new Span(data);

    this.spans.push(span);

    return span;
  }

  /**
   * Finishes the transaction and queues it for sending if:
   * - It's a failure or has critical severity
   * - Its duration is above the critical threshold
   * - Its duration is above the threshold and passes sampling
   *
   * @param status - Status of the transaction ('success' or 'failure'). Defaults to 'success'
   */
  public finish(status: 'success' | 'failure' = 'success'): void {
    this.endTime = getTimestamp();
    this.duration = this.endTime - this.startTime;
    this.finishStatus = status;

    // Always send if it's a failure or critical severity
    if (status === 'failure' || this.severity === 'critical') {
      this.queueForSending();

      return;
    }

    // Always send if duration exceeds critical threshold
    if (this.duration >= this.config.criticalDurationThresholdMs) {
      this.queueForSending();

      return;
    }

    // Filter out short transactions
    if (this.duration < this.config.thresholdMs) {
      return;
    }

    // Apply sampling
    if (this.shouldSample()) {
      this.queueForSending();
    }
  }

  /**
   * Determines if this transaction should be sampled based on configured sample rate
   *
   * @returns True if transaction should be sampled, false otherwise
   */
  private shouldSample(): boolean {
    return Math.random() <= this.config.sampleRate;
  }

  /**
   * Queues this transaction for sending to the server
   */
  private queueForSending(): void {
    this.performance.queueTransaction(this);
  }

  /**
   *
   */
  public get status(): 'success' | 'failure' {
    return this.finishStatus;
  }
}
