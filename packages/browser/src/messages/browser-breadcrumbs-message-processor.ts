import type { MessageProcessor, ProcessingPayload } from '@hawk.so/core';
import type { BreadcrumbsOptions } from '../addons/breadcrumbs';
import { BrowserBreadcrumbStore } from '../addons/breadcrumbs';
import type { ErrorsCatcherType } from '@hawk.so/types/src/catchers/catcher-message';

/**
 * Attaches breadcrumbs to payload.
 */
export class BrowserBreadcrumbsMessageProcessor<T extends ErrorsCatcherType> implements MessageProcessor<T> {
  /**
   * Initialize message processor including {@link BrowserBreadcrumbStore} initialization.
   *
   * @param options {@link BrowserBreadcrumbStore} settings required for initialization.
   */
  constructor(options: BreadcrumbsOptions = {}) {
    const breadcrumbStore = BrowserBreadcrumbStore.getInstance();

    breadcrumbStore.init(options);
  }

  /**
   * Sets `payload.breadcrumbs` from snapshot if non-empty; skips otherwise.
   *
   * @param payload - event message payload to enrich
   * @returns modified payload with breadcrumbs set, or original payload unchanged
   */
  public apply(
    payload: ProcessingPayload<T>
  ): ProcessingPayload<T> | null {
    const breadcrumbs = BrowserBreadcrumbStore.getInstance().get();

    if (breadcrumbs.length > 0) {
      payload.breadcrumbs = breadcrumbs;
    }

    return payload;
  }
}
