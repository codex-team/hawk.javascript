import type { PerformanceMessage } from '../../types/performance-message';
import log from '../../utils/log';
import type Socket from '../socket';
import { Transaction } from './transaction';
import type { AggregatedTransaction, AggregatedSpan } from '../../types/transaction';
import type { Span } from './span';

/**
 * Default interval between batch sends in milliseconds
 */
const DEFAULT_BATCH_INTERVAL = 3000;

/**
 * Default sample rate for performance monitoring
 * Value of 1.0 means all transactions will be sampled
 */
const DEFAULT_SAMPLE_RATE = 1.0;

/**
 * Default threshold in milliseconds for filtering out short transactions
 * Transactions shorter than this duration will not be sent
 */

const DEFAULT_THRESHOLD_MS = 20;

/**
 * Class for managing performance monitoring
 */
export default class PerformanceMonitoring {
  /**
   * Timer for batch sending
   */
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Queue for transactions waiting to be sent
   */
  private sendQueue: Transaction[] = [];

  /**
   * Sample rate for performance monitoring
   */
  private readonly sampleRate: number;

  /**
   * @param transport - Transport instance for sending data
   * @param token - Integration token
   * @param debug - Debug mode flag
   * @param sampleRate - Sample rate for performance data (0.0 to 1.0). Must be between 0 and 1.
   * @param batchInterval - Interval between batch sends in milliseconds. Defaults to 3000ms.
   * @param thresholdMs - Minimum duration threshold in milliseconds. Transactions shorter than this will be filtered out. Defaults to 1000ms.
   */
  constructor(
    private readonly transport: Socket,
    private readonly token: string,
    private readonly debug: boolean = false,
    sampleRate: number = DEFAULT_SAMPLE_RATE,
    private readonly batchInterval: number = DEFAULT_BATCH_INTERVAL,
    private readonly thresholdMs: number = DEFAULT_THRESHOLD_MS
  ) {
    if (sampleRate < 0 || sampleRate > 1) {
      console.error('Performance monitoring sample rate must be between 0 and 1');
      sampleRate = 1;
    }

    this.sampleRate = Math.max(0, Math.min(1, sampleRate));
  }

  /**
   * Queue transaction for sending
   *
   * @param transaction - Transaction to queue
   */
  public queueTransaction(transaction: Transaction): void {
    this.sendQueue.push(transaction);

    if (this.sendQueue.length === 1) {
      this.scheduleBatchSend();
    }
  }

  /**
   * Starts a new transaction
   *
   * @param name - Transaction name
   * @param tags - Optional tags for the transaction
   * @param severity - Severity of the transaction
   * @returns Transaction object
   */
  public startTransaction(name: string, severity: 'default' | 'critical' = 'default'): Transaction {
    const data = {
      name,
      severity,
    };

    return new Transaction(data, this, {
      sampleRate: this.sampleRate,
      thresholdMs: this.thresholdMs,
    });
  }

  /**
   * Clean up resources and ensure all data is sent
   */
  public destroy(): void {
    // Clear batch sending timer
    if (this.batchTimeout !== null) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    // Force send any remaining queued data
    if (this.sendQueue.length > 0) {
      void this.processSendQueue();
    }
  }

  /**
   * Schedule periodic batch sending of transactions
   */
  private scheduleBatchSend(): void {
    this.batchTimeout = setTimeout(() => {
      void this.processSendQueue();
    }, this.batchInterval);
  }

  /**
   * Process queued transactions in batch
   */
  private async processSendQueue(): Promise<void> {
    if (this.sendQueue.length === 0) {
      return;
    }

    const transactions = [ ...this.sendQueue ];

    this.sendQueue = [];

    try {
      const aggregatedTransactions = this.aggregateTransactions(transactions);

      await this.sendPerformanceData(aggregatedTransactions);
    } catch (error) {
      // todo: add repeats limit
      this.sendQueue.push(...transactions);

      if (this.debug) {
        log('Failed to send performance data', 'error', error);
      }
    }
  }

  /**
   * Aggregates transactions into statistical summaries grouped by name
   *
   * @param transactions
   */
  private aggregateTransactions(transactions: Transaction[]): AggregatedTransaction[] {
    const transactionsByName = new Map<string, Transaction[]>();

    // Group transactions by name
    transactions.forEach(transaction => {
      const group = transactionsByName.get(transaction.name) || [];

      group.push(transaction);
      transactionsByName.set(transaction.name, group);
    });

    // Aggregate each group
    return Array.from(transactionsByName.entries()).map(([name, group]) => {
      const durations = group.map(t => t.duration ?? 0).sort((a, b) => a - b);
      const startTimes = group.map(t => t.startTime ?? 0);
      const endTimes = group.map((transaction, index) => transaction.endTime ?? startTimes[index]);

      // Calculate failure rate
      const failureCount = group.filter(t => t.finishStatus === 'failure').length;
      const failureRate = (failureCount / group.length) * 100;

      return {
        aggregationId: `${name}-${Date.now()}`,
        name,
        avgStartTime: this.average(startTimes),
        minStartTime: Math.min(...startTimes),
        maxEndTime: Math.max(...endTimes),
        p50duration: this.percentile(durations, 50),
        p95duration: this.percentile(durations, 95),
        maxDuration: Math.max(...durations),
        count: group.length,
        failureRate,
        aggregatedSpans: this.aggregateSpans(group),
      };
    });
  }

  /**
   * Aggregates spans from multiple transactions into statistical summaries
   * Groups spans by name across all transactions in the group
   * 
   * @param transactions - Transactions containing spans to aggregate
   * @returns Array of aggregated spans with statistical metrics
   */
  private aggregateSpans(transactions: Transaction[]): AggregatedSpan[] {
    const spansByName = new Map<string, Span[]>();
    
    // Group spans by name across all transactions
    transactions.forEach(transaction => {
      transaction.spans.forEach(span => {
        const spans = spansByName.get(span.name) || [];

        spans.push(span);
        spansByName.set(span.name, spans);
      });
    });

    // Aggregate each group of spans
    return Array.from(spansByName.entries()).map(([name, spans]) => {
      const durations = spans.map(s => s.duration ?? 0).sort((a, b) => a - b);
      const startTimes = spans.map(s => s.startTime ?? 0);
      const endTimes = spans.map((s, index) => s.endTime ?? startTimes[index]);
      
      // Calculate failure rate for spans
      const failureCount = spans.filter(s => s.status === 'failure').length;
      const failureRate = (failureCount / spans.length) * 100;

      return {
        aggregationId: `${name}-${Date.now()}`,
        name,
        minStartTime: Math.min(...startTimes),
        maxEndTime: Math.max(...endTimes),
        p50duration: this.percentile(durations, 50),
        p95duration: this.percentile(durations, 95),
        maxDuration: Math.max(...durations),
        failureRate
      };
    });
  }

  /**
   * Calculates the percentile value from a sorted array of numbers
   * @param sortedValues - Sorted array of numbers
   * @param p - Percentile to calculate (e.g., 50 for median, 95 for 95th percentile)
   * @returns Percentile value
   */
  private percentile(sortedValues: number[], p: number): number {
    const index = Math.ceil((p / 100) * sortedValues.length) - 1;

    return sortedValues[index];
  }

  /**
   * Calculates the average value from an array of numbers
   * @param values - Array of numbers
   * @returns Average value
   */
  private average(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Sends performance data to Hawk collector
   *
   * @param transactions - Array of aggregated transactions to send
   */
  private async sendPerformanceData(transactions: AggregatedTransaction[]): Promise<void> {
    const performanceMessage: PerformanceMessage = {
      token: this.token,
      catcherType: 'performance',
      payload: {
        transactions,
      },
    };

    await this.transport.send(performanceMessage);
  }
}
