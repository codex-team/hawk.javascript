import { EventData, JavaScriptAddons } from '../../../types';

/**
 * Structure describing a message sending by Catcher
 */
export default interface CatcherMessage {
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
  payload: EventData<JavaScriptAddons>;
};
