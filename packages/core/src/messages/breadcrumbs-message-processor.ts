import type { ErrorSnapshot, MessageProcessor, ProcessingPayload } from './message-processor';

/**
 * Attaches breadcrumbs to payload.
 */
export class BreadcrumbsMessageProcessor implements MessageProcessor<'errors/javascript'> {
  /**
   * Sets `payload.breadcrumbs` from snapshot if non-empty; skips otherwise.
   *
   * @param payload - event message payload to enrich
   * @param snapshot - snapshot carrying breadcrumbs captured at error time
   * @returns modified payload with breadcrumbs set, or original payload unchanged
   */
  public apply(
    payload: ProcessingPayload<'errors/javascript'>,
    snapshot?: ErrorSnapshot
  ): ProcessingPayload<'errors/javascript'> | null {
    if (snapshot?.breadcrumbs && snapshot.breadcrumbs.length > 0) {
      payload.breadcrumbs = snapshot.breadcrumbs;
    }

    return payload;
  }
}
