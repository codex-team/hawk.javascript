import type { MessageHint, MessageProcessor } from '@hawk.so/core';
import type { CatcherMessagePayload } from '@hawk.so/types';

/**
 * Appends `RAW_EVENT_DATA` to the event addons for debug purposes.
 */
export class DebugMessageProcessor implements MessageProcessor<'errors/javascript'> {
  /**
   * Writes name, message, and stack from `hint.error` into `payload.addons.RAW_EVENT_DATA`.
   * Skips if hint error is not Error instance or `payload.addons` is absent.
   *
   * @param payload - event message payload to enrich
   * @param hint - hint carrying original caught error
   * @returns modified payload with RAW_EVENT_DATA set, or original payload unchanged
   */
  public apply(
    payload: CatcherMessagePayload<'errors/javascript'>,
    hint?: MessageHint
  ): CatcherMessagePayload<'errors/javascript'> | null {
    if (!(hint?.error instanceof Error) || !payload.addons) {
      return payload;
    }

    payload.addons.RAW_EVENT_DATA = {
      name: hint.error.name,
      message: hint.error.message,
      stack: hint.error.stack ?? '',
    };

    return payload;
  }
}
