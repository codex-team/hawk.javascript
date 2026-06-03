import type { CatcherMessage, CatcherMessageType } from '@hawk.so/types';
import type { Transport } from './transport';

declare module '@hawk.so/types' {
  // eslint-disable-next-line @typescript-eslint/no-shadow, @typescript-eslint/naming-convention
  interface CatcherMessage<_Type extends CatcherMessageType> {
    /**
     * Number of identical occurrences this message represents.
     * Absent or 1 — treated as single event by server.
     * Greater than 1 — server increments totalCount by this value instead of 1.
     */
    count?: number;
  }
}

/**
 * Options for EventDedupeTransport.
 */
export interface EventDedupeTransportOptions {
  /**
   * Time window in milliseconds.
   * Each unique event is held for this duration to accumulate duplicate count,
   * then forwarded once with {@link CatcherMessage.count} set to total occurrences.
   */
  windowMs?: number;
}

/**
 * Single entry in dedupe buffer.
 */
interface BufferEntry<T extends CatcherMessageType> {
  message: CatcherMessage<T>;
  count: number;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Computes deduplication key from catcher type and event title.
 * Matches grouping criteria used by server-side grouper worker.
 *
 * @param message - message to compute signature for
 */
function computeSignature<T extends CatcherMessageType>(message: CatcherMessage<T>): string {
  const title = (message.payload as { title?: string }).title ?? '';

  return `${message.catcherType}\x00${title}`;
}

/**
 * Returns message with count attached.
 * Returns original message unchanged when count is 1 —
 * server treats absent count as single occurrence.
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

  return { ...message,
    count };
}

/**
 * Transport decorator that deduplicates identical events within a time window.
 *
 * Events with the same catcher type and title are considered identical.
 * First occurrence is buffered and a timer is started; subsequent identical events
 * within the window increment the counter without resetting the timer.
 * When the window expires, one representative message is forwarded with
 * {@link CatcherMessage.count} set to total occurrences.
 *
 * Each unique event signature has its own independent timer.
 * Call {@link EventDedupeTransport.flush} to forward all buffered events immediately (e.g. on page unload).
 */
export class EventDedupeTransport<T extends CatcherMessageType> implements Transport<T> {
  private readonly transport: Transport<T>;
  private readonly windowMs: number;
  private readonly buffer = new Map<string, BufferEntry<T>>();

  /**
   * @param transport - underlying transport to forward deduplicated events to
   * @param options - optional tuning parameters
   */
  constructor(transport: Transport<T>, options: EventDedupeTransportOptions = {}) {
    this.transport = transport;
    this.windowMs = options.windowMs ?? 2_500;
  }

  /**
   * Accepts incoming message. Starts a dedupe window for new signatures;
   * increments count for already-buffered signatures.
   *
   * @param message - message to buffer
   */
  public async send(message: CatcherMessage<T>): Promise<void> {
    const key = computeSignature(message);
    const existing = this.buffer.get(key);

    const sendEntry = (entry: BufferEntry<T>): void => {
      if (entry !== undefined) {
        this.buffer.delete(key);
        void this.transport.send(withCount(entry.message, entry.count));
      }
    };

    if (existing !== undefined) {
      clearTimeout(existing.timer);
      existing.count++;
      existing.timer = setTimeout(() => sendEntry(existing), this.windowMs);

      return;
    }

    const timer = setTimeout(() => {
      const entry = this.buffer.get(key);

      if (entry !== undefined) {
        sendEntry(entry);
      }
    }, this.windowMs);

    this.buffer.set(key, { message,
      count: 1,
      timer });
  }

  /**
   * Forwards all buffered messages to underlying transport immediately.
   * Cancels pending timers. Safe to call when buffer is empty.
   */
  public flush(): void {
    for (const [key, entry] of this.buffer) {
      clearTimeout(entry.timer);
      this.buffer.delete(key);
      void this.transport.send(withCount(entry.message, entry.count));
    }
  }
}
