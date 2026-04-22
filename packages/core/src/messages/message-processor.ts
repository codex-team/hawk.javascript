import type { Breadcrumb, CatcherMessagePayload, CatcherMessageType } from '@hawk.so/types';

/**
 * Extracted addons type from catcher message payload.
 *
 * @typeParam T - catcher message type
 */
type ExtractAddons<T extends CatcherMessageType> =
  CatcherMessagePayload<T> extends { addons?: infer A } ? A : never;

/**
 * Payload type used during message processing pipeline.
 *
 * Same as {@link CatcherMessagePayload} but with `addons` always defined and partially filled —
 * processors may contribute individual addon fields independently of each other.
 *
 * @typeParam T - catcher message type this payload belongs to
 */
export type ProcessingPayload<T extends CatcherMessageType> =
  Omit<CatcherMessagePayload<T>, 'addons'> & {
    addons: Partial<ExtractAddons<T>>;
  };

/**
 * Snapshot of event context captured synchronously at error time,
 * before any processing.
 */
export interface ErrorSnapshot {
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
   * Handles input message. May mutate, replace or drop it.
   *
   * Dropped message won't be sent.
   *
   * @param payload - processed event message payload with partially-built addons
   * @param snapshot - additional context with original error
   * @returns modified payload, or `null` to drop message
   */
  apply(
    payload: ProcessingPayload<T>,
    snapshot?: ErrorSnapshot,
  ): ProcessingPayload<T> | null
}
