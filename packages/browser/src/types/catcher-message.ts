import type { HawkJavaScriptEvent } from './event';

/**
 * Structure describing a message sending by Catcher
 */
export interface CatcherMessage {
  /**
   * User project's Integration Token
   */
  token: string;

  /**
   * Hawk Catcher name
   */
  catcherType: string;

  /**
   * All information about the event
   */
  payload: HawkJavaScriptEvent;
}
