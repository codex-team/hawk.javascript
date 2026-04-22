import type { ErrorSnapshot, MessageProcessor, ProcessingPayload } from './message-processor';
import { ErrorsCatcherType } from '@hawk.so/types';

/**
 * Attaches breadcrumbs to payload.
 */
export class BreadcrumbsMessageProcessor<T extends ErrorsCatcherType> implements MessageProcessor<T>  {
  /**
   * Sets `payload.breadcrumbs` from snapshot if non-empty; skips otherwise.
   *
   * @param payload - event message payload to enrich
   * @param snapshot - snapshot carrying breadcrumbs captured at error time
   * @returns modified payload with breadcrumbs set, or original payload unchanged
   */
  public apply(
    payload: ProcessingPayload<T>,
    snapshot?: ErrorSnapshot
  ): ProcessingPayload<T> | null {
    if (snapshot?.breadcrumbs && snapshot.breadcrumbs.length > 0) {
      payload.breadcrumbs = snapshot.breadcrumbs;
    }

    return payload;
  }
}
