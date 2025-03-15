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
 * Class representing a span of work within a transaction
 */
export class Span {
  public readonly id: string;
  public readonly transactionId: string;
  public readonly name: string;
  public readonly startTime: number;
  public endTime?: number;
  public duration?: number;
  public readonly metadata?: Record<string, unknown>;

  /**
   * Constructor for Span
   *
   * @param data - Data to initialize the span with. Contains id, transactionId, name, startTime, metadata
   */
  constructor(data: Omit<Span, 'finish'>) {
    Object.assign(this, data);
  }

  /**
   *
   */
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

  /**
   *
   * @param data
   * @param performance
   */
  constructor(
    data: Omit<Transaction, 'startSpan' | 'finish'>,
    private readonly performance: PerformanceMonitoring
  ) {
    Object.assign(this, data);
  }

  /**
   *
   * @param name
   * @param metadata
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
}

/**
 * Class representing a sampled out transaction that won't be sent to server
 */
class SampledOutTransaction extends Transaction {
  /**
   * Constructor for SampledOutTransaction
   *
   * @param data - Data to initialize the transaction with. Contains id, name, startTime, tags and spans
   */
  constructor(data: Omit<Transaction, 'startSpan' | 'finish'>) {
    super(data, null as unknown as PerformanceMonitoring); // performance не используется
  }

  /**
   * Start a new span within this sampled out transaction
   *
   * @param name - Name of the span
   * @param metadata - Optional metadata to attach to the span
   * @returns A new Span instance that won't be sent to server
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
    // Do nothing - don't send to server
  }
}

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

  private readonly sampleRate: number;

  /**
   * @param transport - Transport instance for sending data
   * @param token - Integration token
   * @param version - Catcher version
   * @param debug - Debug mode flag
   * @param sampleRate - Sample rate for performance data (0.0 to 1.0)
   */
  constructor(
    private readonly transport: Socket,
    private readonly token: string,
    private readonly version: string,
    private readonly debug: boolean = false,
    sampleRate: number = 1.0
  ) {
    if (sampleRate < 0 || sampleRate > 1) {
      console.error('Performance monitoring sample rate must be between 0 and 1');
      sampleRate = 1;
    }
    this.sampleRate = Math.max(0, Math.min(1, sampleRate));

    if (isBrowser) {
      this.initBeforeUnloadHandler();
    } else {
      this.initProcessExitHandler();
    }
  }

  /**
   * Queue transaction for sending
   *
   * @param transaction
   */
  public queueTransaction(transaction: Transaction): void {
    this.activeTransactions.delete(transaction.id);
    this.sendQueue.push(transaction);
    void this.processSendQueue();
  }


  /**
   * Starts a new transaction
   *
   * @param name - Transaction name
   * @param tags - Optional tags for the transaction
   * @returns Transaction object
   */
  public startTransaction(name: string, tags: Record<string, string> = {}): Transaction {
    // Sample transactions based on rate
    if (Math.random() > this.sampleRate) {
      if (this.debug) {
        log(`Transaction "${name}" was sampled out`, 'info');
      }

      return new SampledOutTransaction({
        id: id(),
        name,
        startTime: getTimestamp(),
        tags,
        spans: [],
      });
    }

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
   * Clean up resources and ensure all data is sent
   */
  public destroy(): void {
    // Finish any remaining transactions
    this.activeTransactions.forEach(transaction => transaction.finish());

    // Force send any remaining queued data
    if (this.sendQueue.length > 0) {
      void this.processSendQueue();
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
   * Process queued transactions
   */
  private async processSendQueue(): Promise<void> {
    if (this.sendQueue.length === 0) {
      return;
    }

    try {
      const transaction = this.sendQueue.shift()!;

      await this.sendPerformanceData(transaction);
    } catch (error) {
      if (this.debug) {
        log('Failed to send performance data', 'error', error);
      }
    }

    if (this.sendQueue.length > 0) {
      void this.processSendQueue();
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
}
