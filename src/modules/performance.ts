import type { PerformanceMessage } from '../types/performance-message';
import type { Transaction } from '../types/transaction';
import type { Span } from '../types/span';
import { id } from '../utils/id';
import log from '../utils/log';
import type Socket from './socket';

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
 * Minimum interval between performance data sends (in milliseconds)
 */
const THROTTLE_INTERVAL = 1000;

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
   * Queue for transactions waiting to be sent
   */
  private sendQueue: Transaction[] = [];

  /**
   * Timestamp of last send operation
   */
  private lastSendTime = 0;

  /**
   * Scheduled send timeout ID
   */
  private sendTimeout: number | NodeJS.Timeout | null = null;

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
  }

  /**
   * Initialize handler for browser page unload
   */
  private initBeforeUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      // Finish any active transactions before unload
      this.activeTransactions.forEach((_, id) => this.finishTransaction(id));
    });
  }

  /**
   * Initialize handler for Node.js process exit
   */
  private initProcessExitHandler(): void {
    process.on('beforeExit', () => {
      // Finish any active transactions before exit
      this.activeTransactions.forEach((_, id) => this.finishTransaction(id));
    });

    ['SIGINT', 'SIGTERM'].forEach(signal => {
      process.on(signal, () => {
        this.activeTransactions.forEach((_, id) => this.finishTransaction(id));
        process.exit(0);
      });
    });
  }

  /**
   * Schedule sending of performance data with throttling
   */
  private scheduleSend(): void {
    if (this.sendTimeout !== null) {
      return;
    }

    const now = Date.now();
    const timeSinceLastSend = now - this.lastSendTime;
    const delay = Math.max(0, THROTTLE_INTERVAL - timeSinceLastSend);

    const timer = isBrowser ? window.setTimeout : setTimeout;

    this.sendTimeout = timer(() => {
      void this.processSendQueue();
    }, delay);
  }

  /**
   * Process queued transactions
   */
  private async processSendQueue(): Promise<void> {
    if (this.sendQueue.length === 0) {
      this.sendTimeout = null;

      return;
    }

    try {
      const transaction = this.sendQueue.shift()!;

      await this.sendPerformanceData(transaction);
      this.lastSendTime = Date.now();
    } catch (error) {
      if (this.debug) {
        log('Failed to send performance data', 'error', error);
      }
    } finally {
      this.sendTimeout = null;
      if (this.sendQueue.length > 0) {
        this.scheduleSend();
      }
    }
  }

  /**
   * Queue transaction for sending
   *
   * @param transaction
   */
  private queueTransaction(transaction: Transaction): void {
    this.sendQueue.push(transaction);
    this.scheduleSend();
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
      spans: [],
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
      metadata,
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
   * Finishes a transaction, calculates its duration and sends it
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

      this.queueTransaction(transaction);
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
        catcherVersion: this.version,
      },
    };

    await this.transport.send(performanceMessage);
  }

  /**
   * Clean up resources and ensure all data is sent
   */
  public destroy(): void {
    // Finish any remaining transactions
    this.activeTransactions.forEach((_, id) => this.finishTransaction(id));

    // Clear any pending send timeout
    if (this.sendTimeout !== null) {
      if (isBrowser) {
        window.clearTimeout(this.sendTimeout as number);
      } else {
        clearTimeout(this.sendTimeout as NodeJS.Timeout);
      }
      this.sendTimeout = null;
    }

    // Force send any remaining queued data
    if (this.sendQueue.length > 0) {
      void this.processSendQueue();
    }
  }
}
