import type { MessageProcessor, ProcessingPayload } from '@hawk.so/core';

/**
 * Appends `RAW_EVENT_DATA` to the event addons for debug purposes.
 */
export class DebugAddonMessageProcessor implements MessageProcessor<'errors/javascript'> {
  /**
   * Writes name, message, and stack from `snapshot.error` into `payload.addons.RAW_EVENT_DATA`.
   * Skips if snapshot error is missing or not Error instance.
   *
   * @param payload - event message payload to enrich
   * @param error - original error
   * @returns modified payload with RAW_EVENT_DATA set, or original payload unchanged
   */
  public apply(
    payload: ProcessingPayload<'errors/javascript'>,
    error?: Error | string
  ): ProcessingPayload<'errors/javascript'> | null {
    if (!(error instanceof Error)) {
      return payload;
    }

    payload.addons.RAW_EVENT_DATA = {
      name: error.name,
      message: error.message,
      stack: error.stack ?? '',
    };

    return payload;
  }
}
