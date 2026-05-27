import type { BacktraceFrame, CatcherMessage, CatcherMessageType } from '@hawk.so/types';
import type { Transport } from './transport';

declare module '@hawk.so/types' {
  interface CatcherMessage<Type extends CatcherMessageType> {
    /**
     * Number of identical occurrences this message represents.
     * Absent or 1 — treated as a single event by server.
     * Greater than 1 — server increments totalCount by this value instead of 1.
     */
    count?: number;
  }
}

/**
 * Minimal shape of payload fields used for signature computation.
 */
interface BatchablePayload {
  title?: string;
  type?: string;
  backtrace?: BacktraceFrame[];
}

/**
 * Single entry in batching buffer.
 */
interface BufferEntry<T extends CatcherMessageType> {
  /** First occurrence — used as representative event for batch. */
  message: CatcherMessage<T>;
  count: number;
}

/**
 * Options for EventBatcher.
 */
export interface EventBatcherOptions {
  /**
   * Time window in milliseconds.
   * Buffer is flushed after this delay from first event in current window.
   */
  flushIntervalMs?: number;

  /**
   * Maximum number of distinct event signatures in buffer before force-flush.
   */
  maxBufferSize?: number;
}

/**
 * Transport decorator that batches identical events before forwarding to underlying transport.
 *
 * Events with same signature (title + type + backtrace frames) are accumulated
 * within a time window. On flush, one representative message per signature is forwarded
 * with {@link CatcherMessage.count} set to total number of occurrences.
 *
 * Flush is triggered by whichever condition is met first:
 * - Time window expires ({@link EventBatcherOptions.flushIntervalMs} after first event)
 * - Buffer reaches {@link EventBatcherOptions.maxBufferSize} distinct signatures
 * - {@link flush} is called explicitly
 *
 * First occurrence is used as representative event for each batch.
 * Context, user, and breadcrumbs of subsequent identical occurrences are not preserved.
 */
export class EventBatcher<T extends CatcherMessageType> implements Transport<T> {
  private readonly transport: Transport<T>;
  private readonly flushIntervalMs: number;
  private readonly maxBufferSize: number;

  private readonly buffer = new Map<string, BufferEntry<T>>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * @param transport - underlying transport to forward flushed batches to
   * @param options - optional tuning parameters
   */
  public constructor(transport: Transport<T>, options: EventBatcherOptions = {}) {
    this.transport = transport;
    this.flushIntervalMs = options.flushIntervalMs ?? 5_000;
    this.maxBufferSize = options.maxBufferSize ?? 100;
  }

  /**
   * Accepts incoming message. Increments count for known signatures,
   * adds new entry for unknown ones, and schedules a flush.
   *
   * @param message - message to buffer
   */
  public async send(message: CatcherMessage<T>): Promise<void> {
    const key = computeSignature(message);
    const existing = this.buffer.get(key);

    if (existing !== undefined) {
      existing.count++;
    } else {
      this.buffer.set(key, { message, count: 1 });
      this.scheduleFlush();
    }

    if (this.buffer.size >= this.maxBufferSize) {
      this.flush();
    }
  }

  /**
   * Forwards all buffered messages to underlying transport immediately.
   * Cancels pending timer if one is active.
   * Safe to call when buffer is empty.
   */
  public flush(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    for (const { message, count } of this.buffer.values()) {
      void this.transport.send(withCount(message, count));
    }

    this.buffer.clear();
  }

  /**
   * Schedules a flush after time window expires.
   * No-op if a timer is already running.
   */
  private scheduleFlush(): void {
    if (this.flushTimer !== null) {
      return;
    }

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, this.flushIntervalMs);
  }
}

/**
 * Computes string key uniquely identifying an event by its semantic content.
 *
 * Covers: title, type, and per-frame coordinates (file, line, column, function).
 * Uses null bytes as field delimiters — safe because error messages and
 * source paths do not contain them.
 *
 * @param message - message to compute signature for
 */
function computeSignature<T extends CatcherMessageType>(message: CatcherMessage<T>): string {
  const p = message.payload as BatchablePayload;

  const framesSig = p.backtrace
    ?.map(f => `${f.file}\x01${f.line}\x01${f.column ?? ''}\x01${f.function ?? ''}`)
    .join('\x00')
    ?? '';

  return `${p.title ?? ''}\x00${p.type ?? ''}\x00${framesSig}`;
}

/**
 * Returns message with count attached.
 * Returns original message unchanged when count is 1 —
 * server treats absent count as a single occurrence.
 *
 * @param message - original message
 * @param count - number of occurrences
 */
function withCount<T extends CatcherMessageType>(
  message: CatcherMessage<T>,
  count: number
): CatcherMessage<T> {
  if (count <= 1) {
    return message;
  }

  return { ...message, count };
}
