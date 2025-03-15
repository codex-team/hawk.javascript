import { PerformanceMessage } from '../types/performance-message';
import type { Transaction } from '../types/transaction';
import type { Span } from '../types/span';
import { id } from '../utils/id';
import log from '../utils/log';
import type Socket from './socket';

/**
 * Default batch sending interval in milliseconds
 */
const BATCH_INTERVAL = 5000;

/**
 * Check if code is running in browser environment
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Get high-resolution timestamp in milliseconds
 */
const getTimestamp = (): number => {
  if (isBrowser) {
    return performance.now();
  }

  /**
   * process.hrtime.bigint() returns nanoseconds
   * Convert to milliseconds for consistency with browser
   */
  return Number(process.hrtime.bigint() / BigInt(1_000_000));
};

/**
 * Class for managing performance monitoring
 */
export default class PerformanceMonitoring {
  /**
   * Active transactions map
   */
  private activeTransactions: Map<string, Transaction> = new Map();

  /**
   * Active spans map
   */
  private activeSpans: Map<string, Span> = new Map();

  /**
   * Queue of completed transactions waiting to be sent
   */
  private queue: Transaction[] = [];

  /**
   * Timer for batch sending
   */
  private batchTimeout: number | NodeJS.Timeout | null = null;

  /**
   * Flag indicating if we're in the process of sending data
   */
  private isSending = false;

  /**
   * @param transport - Transport instance for sending data
   * @param token - Integration token
   * @param version - Catcher version
   * @param debug - Debug mode flag
   */
  constructor(
    private readonly transport: Socket,
    private readonly token: string,
    private readonly version: string,
    private readonly debug: boolean = false
  ) {
    if (isBrowser) {
      this.initBeforeUnloadHandler();
    } else {
      this.initProcessExitHandler();
    }
    
    this.startBatchSending();
  }

  /**
   * Initialize handler for browser page unload
   */
  private initBeforeUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      this.flushQueue();
    });
  }

  /**
   * Initialize handler for Node.js process exit
   */
  private initProcessExitHandler(): void {
    process.on('beforeExit', async () => {
      await this.flushQueue();
    });

    // Handle SIGINT and SIGTERM
    ['SIGINT', 'SIGTERM'].forEach(signal => {
      process.on(signal, async () => {
        await this.flushQueue();
        process.exit(0);
      });
    });
  }

  /**
   * Start batch sending timer
   */
  private startBatchSending(): void {
    if (this.batchTimeout !== null) {
      return;
    }

    const timer = isBrowser ? window.setInterval : setInterval;
    this.batchTimeout = timer(() => {
      void this.sendBatch();
    }, BATCH_INTERVAL);
  }

  /**
   * Stop batch sending timer
   */
  private stopBatchSending(): void {
    if (this.batchTimeout !== null) {
      if (isBrowser) {
        window.clearInterval(this.batchTimeout as number);
      } else {
        clearInterval(this.batchTimeout as NodeJS.Timeout);
      }
      this.batchTimeout = null;
    }
  }

  /**
   * Send batch of transactions
   */
  private async sendBatch(): Promise<void> {
    if (this.isSending || this.queue.length === 0) {
      return;
    }

    this.isSending = true;

    const batch = this.queue;
    
    try {
      this.queue = [];

      await Promise.all(
        batch.map(transaction => this.sendPerformanceData(transaction))
      );
    } catch (error) {
      log('Failed to send performance data batch', 'error', error);
      // Return failed transactions to the queue
      this.queue.unshift(...batch);
    } finally {
      this.isSending = false;
    }
  }

  /**
   * Immediately send all queued transactions
   */
  private async flushQueue(): Promise<void> {
    this.stopBatchSending();
    await this.sendBatch();
  }

  /**
   * Starts a new transaction
   * 
   * @param name - Transaction name
   * @param tags - Optional tags for the transaction
   * @returns Transaction object
   */
  public startTransaction(name: string, tags: Record<string, string> = {}): Transaction {
    const transaction: Transaction = {
      id: id(),
      traceId: id(),
      name,
      startTime: getTimestamp(),
      tags,
      spans: []
    };

    this.activeTransactions.set(transaction.id, transaction);
    return transaction;
  }

  /**
   * Starts a new span within a transaction
   * 
   * @param transactionId - Parent transaction ID
   * @param name - Span name
   * @param metadata - Optional metadata for the span
   * @returns Span object
   */
  public startSpan(transactionId: string, name: string, metadata?: Record<string, any>): Span {
    const span: Span = {
      id: id(),
      transactionId,
      name,
      startTime: getTimestamp(),
      metadata
    };

    this.activeSpans.set(span.id, span);
    const transaction = this.activeTransactions.get(transactionId);

    if (transaction) {
      transaction.spans.push(span);
    }

    return span;
  }

  /**
   * Finishes a span and calculates its duration
   * 
   * @param spanId - ID of the span to finish
   */
  public finishSpan(spanId: string): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.endTime = getTimestamp();
      span.duration = span.endTime - span.startTime;
      this.activeSpans.delete(spanId);
    }
  }

  /**
   * Finishes a transaction, calculates its duration and queues it for sending
   * 
   * @param transactionId - ID of the transaction to finish
   */
  public finishTransaction(transactionId: string): void {
    const transaction = this.activeTransactions.get(transactionId);
    if (transaction) {
      // Finish all active spans belonging to this transaction
      transaction.spans.forEach(span => {
        if (!span.endTime) {
          if (this.debug) {
            log(`Automatically finishing uncompleted span "${span.name}" in transaction "${transaction.name}"`, 'warn');
          }

          const activeSpan = this.activeSpans.get(span.id);
          if (activeSpan) {
            activeSpan.endTime = getTimestamp();
            activeSpan.duration = activeSpan.endTime - activeSpan.startTime;
            this.activeSpans.delete(span.id);

            // Update span in transaction with final data
            Object.assign(span, activeSpan);
          }
        }
      });

      transaction.endTime = getTimestamp();
      transaction.duration = transaction.endTime - transaction.startTime;
      this.activeTransactions.delete(transactionId);
      
      this.queue.push(transaction);
    }
  }

  /**
   * Sends performance data to Hawk collector
   * 
   * @param transaction - Transaction data to send
   */
  private async sendPerformanceData(transaction: Transaction): Promise<void> {
    const performanceMessage: PerformanceMessage = {
      token: this.token,
      catcherType: 'performance',
      payload: {
        ...transaction,
        catcherVersion: this.version
      }
    };

    await this.transport.send(performanceMessage);
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.stopBatchSending();
  }
} 
