import type { ErrorSnapshot, MessageProcessor, ProcessingPayload } from '@hawk.so/core';

/**
 * Appends `RAW_EVENT_DATA` to the event addons for debug purposes.
 */
export class DebugAddonMessageProcessor implements MessageProcessor<'errors/javascript'> {
  /**
   * Writes name, message, and stack from `snapshot.error` into `payload.addons.RAW_EVENT_DATA`.
   * Skips if snapshot error is missing or not Error instance.
   *
   * @param payload - event message payload to enrich
   * @param snapshot - snapshot carrying original caught error
   * @returns modified payload with RAW_EVENT_DATA set, or original payload unchanged
   */
  public apply(
    payload: ProcessingPayload<'errors/javascript'>,
    snapshot?: ErrorSnapshot
  ): ProcessingPayload<'errors/javascript'> | null {
    if (!(snapshot?.error instanceof Error)) {
      return payload;
    }

    payload.addons.RAW_EVENT_DATA = {
      name: snapshot.error.name,
      message: snapshot.error.message,
      stack: snapshot.error.stack ?? '',
    };

    return payload;
  }
}
