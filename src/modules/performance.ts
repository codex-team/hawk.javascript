import type { PerformanceMessage } from '../types/performance-message';
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
      this.activeTransactions.forEach(transaction => transaction.finish());
    });
  }

  /**
   * Initialize handler for Node.js process exit
   */
  private initProcessExitHandler(): void {
    process.on('beforeExit', () => {
      // Finish any active transactions before exit
      this.activeTransactions.forEach(transaction => transaction.finish());
    });

    ['SIGINT', 'SIGTERM'].forEach(signal => {
      process.on(signal, () => {
        this.activeTransactions.forEach(transaction => transaction.finish());
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
   */
  public queueTransaction(transaction: Transaction): void {
    this.activeTransactions.delete(transaction.id);
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
    const data = {
      id: id(),
      name,
      startTime: getTimestamp(),
      tags,
      spans: [],
    };

    const transaction = new Transaction(data, this);
    this.activeTransactions.set(transaction.id, transaction);
    return transaction;
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
    this.activeTransactions.forEach(transaction => transaction.finish());

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

/**
 * Class representing a span of work within a transaction
 */
export class Span {
  public readonly id: string;
  public readonly transactionId: string;
  public readonly name: string;
  public readonly startTime: number;
  public endTime?: number;
  public duration?: number;
  public readonly metadata?: Record<string, any>;

  constructor(data: Omit<Span, 'finish'>) {
    Object.assign(this, data);
  }

  public finish(): void {
    this.endTime = getTimestamp();
    this.duration = this.endTime - this.startTime;
  }
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

  constructor(
    data: Omit<Transaction, 'startSpan' | 'finish'>,
    private readonly performance: PerformanceMonitoring
  ) {
    Object.assign(this, data);
  }

  public startSpan(name: string, metadata?: Record<string, any>): Span {
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
}
