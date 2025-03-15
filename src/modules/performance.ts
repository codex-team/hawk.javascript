import { PerformanceMessage } from '../types/performance-message';
import type { Transaction } from '../types/transaction';
import type { Span } from '../types/span';
import { id } from '../utils/id';
import log from '../utils/log';
import type Socket from './socket';

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
   * @param transport - Transport instance for sending data
   * @param token - Integration token
   * @param version - Catcher version
   */
  constructor(
    private readonly transport: Socket,
    private readonly token: string,
    private readonly version: string
  ) {}

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
      startTime: performance.now(),
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
      startTime: performance.now(),
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
      span.endTime = performance.now();
      span.duration = span.endTime - span.startTime;
      this.activeSpans.delete(spanId);
    }
  }

  /**
   * Finishes a transaction, calculates its duration and sends the data
   * 
   * @param transactionId - ID of the transaction to finish
   */
  public finishTransaction(transactionId: string): void {
    const transaction = this.activeTransactions.get(transactionId);
    if (transaction) {
      transaction.endTime = performance.now();
      transaction.duration = transaction.endTime - transaction.startTime;
      this.activeTransactions.delete(transactionId);
      
      this.sendPerformanceData(transaction);
    }
  }

  /**
   * Sends performance data to Hawk collector
   * 
   * @param transaction - Transaction data to send
   */
  private sendPerformanceData(transaction: Transaction): void {
    const performanceMessage: PerformanceMessage = {
      token: this.token,
      catcherType: 'performance',
      payload: {
        ...transaction,
        catcherVersion: this.version
      }
    };

    this.transport.send(performanceMessage)
      .catch((error) => {
        log('Failed to send performance data', 'error', error);
      });
  }
} 
