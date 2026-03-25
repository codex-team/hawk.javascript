import type { CatcherMessagePayload } from '@hawk.so/types';
import type { MessageHint, MessageProcessor } from './message-processor';

/**
 * Attaches breadcrumbs snapshot from {@link hint} to payload.
 */
export class BreadcrumbsMessageProcessor implements MessageProcessor<'errors/javascript'> {
  /**
   * Sets `payload.breadcrumbs` from hint snapshot if non-empty; skips otherwise.
   *
   * @param payload - event message payload to enrich
   * @param hint - hint carrying breadcrumbs snapshot captured at error time
   * @returns modified payload with breadcrumbs set, or original payload unchanged
   */
  public apply(
    payload: CatcherMessagePayload<'errors/javascript'>,
    hint?: MessageHint
  ): CatcherMessagePayload<'errors/javascript'> | null {
    if (hint?.breadcrumbs && hint.breadcrumbs.length > 0) {
      payload.breadcrumbs = hint.breadcrumbs;
    }

    return payload;
  }
}
