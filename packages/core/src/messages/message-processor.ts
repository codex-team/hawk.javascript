import type { CatcherMessagePayload, CatcherMessageType } from '@hawk.so/types';

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
   * @param error - original error
   * @returns modified payload, or `null` to drop message
   */
  apply(
    payload: ProcessingPayload<T>,
    error?: Error | string,
  ): ProcessingPayload<T> | null
}
