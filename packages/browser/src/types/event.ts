import type { AffectedUser, BacktraceFrame, EventContext, EventData, JavaScriptAddons, Breadcrumb } from '@hawk.so/types';

/**
 * Event data with JS specific addons
 */
type JSEventData = EventData<JavaScriptAddons>;

/**
 * Event will be sent to Hawk by Hawk JavaScript SDK
 *
 * The listed EventData properties will always be sent, so we define them as required in the type
 */
export type HawkJavaScriptEvent = Omit<JSEventData, 'type' | 'release' | 'breadcrumbs' | 'user' | 'context' | 'addons' | 'backtrace' | 'catcherVersion'> & {
  /**
   * Event type: TypeError, ReferenceError etc
   * null for non-error events
   */
  type: string | null;

  /**
   * Current release (aka version, revision) of an application
   */
  release: string | null;

  /**
   * Breadcrumbs - chronological trail of events before the error
   */
  breadcrumbs: Breadcrumb[] | null;

  /**
   * Current authenticated user
   */
  user: AffectedUser | null;

  /**
   * Any other information collected and passed by user
   */
  context: EventContext;

  /**
   * Catcher-specific information
   */
  addons: JavaScriptAddons;

  /**
   * Stack
   * From the latest call to the earliest
   */
  backtrace: BacktraceFrame[] | null;

  /**
   * Catcher version
   */
  catcherVersion: string;
};
