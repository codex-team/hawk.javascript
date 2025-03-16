import type { PerformanceMessage } from '../../types/performance-message';
import { id } from '../../utils/id';
import log from '../../utils/log';
import type Socket from '../socket';
import { isBrowser } from '../../utils/is-browser';
import { getTimestamp } from '../../utils/get-timestamp';
import { Transaction, SampledOutTransaction } from './transaction';

/**
 * Default interval between batch sends in milliseconds
 */
const DEFAULT_BATCH_INTERVAL = 3000;



/**
 * Class for managing performance monitoring
 */
export default class PerformanceMonitoring {
  /**
   * Timer for batch sending
   */
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Map of active transactions by their ID
   * Used to:
   * - Track transactions that haven't been finished yet
   * - Finish all active transactions on page unload/process exit
   * - Prevent memory leaks by removing finished transactions
   */
  private activeTransactions: Map<string, Transaction> = new Map();

  /**
   * Queue for transactions waiting to be sent
   */
  private sendQueue: Transaction[] = [];

  /**
   * Sample rate for performance data
   * Used to determine if a transaction should be sampled out
   */
  private readonly sampleRate: number;

  /**
   * @param transport - Transport instance for sending data
   * @param token - Integration token
   * @param version - Catcher version
   * @param debug - Debug mode flag
   * @param sampleRate - Sample rate for performance data (0.0 to 1.0)
   * @param batchInterval - Interval between batch sends in milliseconds
   */
  constructor(
    private readonly transport: Socket,
    private readonly token: string,
    private readonly version: string,
    private readonly debug: boolean = false,
    sampleRate: number = 1.0,
    private readonly batchInterval: number = DEFAULT_BATCH_INTERVAL
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

    // Start batch sending timer
    this.scheduleBatchSend();
  }

  /**
   * Queue transaction for sending
   *
   * @param transaction
   */
  public queueTransaction(transaction: Transaction): void {
    this.activeTransactions.delete(transaction.id);
    this.sendQueue.push(transaction);
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
    // Clear batch sending timer
    if (this.batchTimeout !== null) {
      const clear = isBrowser ? window.clearInterval : clearInterval;

      clear(this.batchTimeout);
      this.batchTimeout = null;
    }

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
      // Finish any active transactions
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
        // Prevent immediate exit
        this.destroy();
        process.exit(0);
      });
    });
  }

  /**
   * Schedule periodic batch sending of transactions
   */
  private scheduleBatchSend(): void {
    const timer = isBrowser ? window.setInterval : setInterval;

    // Устанавливаем интервал для последующих отправок
    this.batchTimeout = timer(() => void this.processSendQueue(), this.batchInterval);
  }

  /**
   * Process queued transactions in batch
   */
  private async processSendQueue(): Promise<void> {
    if (this.sendQueue.length === 0) {
      return;
    }

    // Get all transactions from queue
    const transactions = [ ...this.sendQueue ];

    this.sendQueue = [];

    try {
      await this.sendPerformanceData(transactions);
    } catch (error) {
      // Return failed transactions to queue
      this.sendQueue.push(...transactions);

      if (this.debug) {
        log('Failed to send performance data', 'error', error);
      }
    }
  }

  /**
   * Sends performance data to Hawk collector
   *
   * @param transactions - Array of transactions to send
   */
  private async sendPerformanceData(transactions: Transaction[]): Promise<void> {
    const performanceMessage: PerformanceMessage = {
      token: this.token,
      catcherType: 'performance',
      payload: transactions.map(transaction => ({
        ...transaction.getData(),
        catcherVersion: this.version,
      })),
    };

    await this.transport.send(performanceMessage);
  }
}
