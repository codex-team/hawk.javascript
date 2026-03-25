import type { Breadcrumb, CatcherMessagePayload, CatcherMessageType } from '@hawk.so/types';

/**
 * Snapshot of event context captured synchronously at error time,
 * before any processing.
 */
export interface MessageHint {
  /**
   * Original caught error.
   */
  error?: Error | string;

  /**
   * Breadcrumbs captured at error time.
   */
  breadcrumbs?: Breadcrumb[];
}

/**
 * Single step in message processing pipeline before message is sent.
 *
 * @typeParam T - catcher message type this processor handles
 */
export interface MessageProcessor<T extends CatcherMessageType = CatcherMessageType> {
  /**
   * Handles input message. May mutate or replace it.
   *
   * @param payload - processed event message payload
   * @param hint - additional context about original error
   * @returns modified payload, or `null` to drop event
   */
  apply(
    payload: CatcherMessagePayload<T>,
    hint?: MessageHint,
  ): CatcherMessagePayload<T> | null
}
