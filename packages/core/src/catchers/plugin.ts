import type { CatcherMessagePayload, CatcherMessageType } from '@hawk.so/types';
import type { BreadcrumbStore } from '../breadcrumbs/breadcrumb-store';

/**
 * Plugin interface for extending HawkCatcher functionality.
 *
 * Plugins can:
 * - run setup logic when the catcher initializes ({@link setup})
 * - enrich or drop events in the send pipeline ({@link processEvent})
 * - receive the breadcrumb store to add breadcrumbs ({@link setupBreadcrumbs})
 */
export interface HawkCatcherPlugin<T extends CatcherMessageType = CatcherMessageType> {
  /**
   * Unique plugin name
   */
  readonly name: string;

  /**
   * Called once when the catcher is constructed.
   * Use this to set up error handlers, interceptors, etc.
   *
   * @param catcher - the catcher instance that owns this plugin
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setup?(catcher: any): void;

  /**
   * Called after the catcher is set up with a reference to breadcrumb store.
   * Use this to add breadcrumbs from your integration.
   *
   * @param store - active {@link BreadcrumbStore}
   */
  setupBreadcrumbs?(store: BreadcrumbStore): void;

  /**
   * Handles event before it is sent.
   *
   * @param event - event payload
   * @param hint - extra data provided by the capture call
   * @return either possibly mutated event to continue the pipeline
   * or `null` to drop event silently
   */
  processEvent?(
    event: CatcherMessagePayload<T>,
    hint: Record<string, unknown>
  ): CatcherMessagePayload<T> | null | Promise<CatcherMessagePayload<T> | null>;
}
