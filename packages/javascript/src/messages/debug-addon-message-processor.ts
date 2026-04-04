import type { MessageHint, MessageProcessor, ProcessingPayload } from '@hawk.so/core';

/**
 * Appends `RAW_EVENT_DATA` to the event addons for debug purposes.
 */
export class DebugAddonMessageProcessor implements MessageProcessor<'errors/javascript'> {
  /**
   * Writes name, message, and stack from `hint.error` into `payload.addons.RAW_EVENT_DATA`.
   * Skips if hint error is not Error instance.
   *
   * @param payload - event message payload to enrich
   * @param hint - hint carrying original caught error
   * @returns modified payload with RAW_EVENT_DATA set, or original payload unchanged
   */
  public apply(
    payload: ProcessingPayload<'errors/javascript'>,
    hint?: MessageHint
  ): ProcessingPayload<'errors/javascript'> | null {
    if (!(hint?.error instanceof Error)) {
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
