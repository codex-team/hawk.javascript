import type { EventData, JavaScriptAddons } from '@hawk.so/types';

/**
 * Event data with JS specific addons
 */
type JSEventData = EventData<JavaScriptAddons>;

/**
 * Event will be sent to Hawk by Hawk JavaScript SDK
 *
 * The listed EventData properties will always be sent, so we define them as required in the type
 */
export type HawkJavaScriptEvent = Omit<JSEventData, 'type' | 'release' | 'user' | 'context' | 'addons' | 'backtrace' | 'catcherVersion'> & {
  /**
   * Event type: TypeError, ReferenceError etc
   */
  type: JSEventData['type'];

  /**
   * Current release (aka version, revision) of an application
   */
  release: JSEventData['release'] | null;

  /**
   * Current authenticated user
   */
  user: JSEventData['user'] | null;

  /**
   * Any other information collected and passed by user
   */
  context: JSEventData['context'];

  /**
   *
   * Catcher-specific information
   */
  addons: JSEventData['addons'];

  /**
   * Stack
   * From the latest call to the earliest
   */
  backtrace: JSEventData['backtrace'] | null;

  /**
   * Catcher version
   */
  catcherVersion: JSEventData['catcherVersion'];
};
