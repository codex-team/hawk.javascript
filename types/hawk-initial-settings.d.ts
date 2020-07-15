/**
 * JS Catcher initial settings
 *
 * @copyright CodeX
 */
import {HawkEventContext, HawkUser} from './hawk-event';

export interface HawkInitialSettings {
  /**
   * User project's Integration Token
   */
  token: string;

  /**
   * Current release and bundle version
   */
  release?: string;

  /**
   * Current user information
   */
  user?: HawkUser;

  /**
   * Any additional data you want to send with every event
   */
  context?: HawkEventContext;

  /**
   * How many time we should try to reconnect when connection lost.
   */
  reconnectionAttempts?: number;

  /**
   * How many time we should wait between reconnection attempts.
   */
  reconnectionTimeout?: number;

  /**
   * Hawk Collector endpoint.
   * Can be overwritten for development purposes.
   * @example ws://localhost:3000/ws
   */
  collectorEndpoint?: string;

  /**
   * Instance of a vue application
   * to handle its errors
   */
  vue?: any;
}

export {
  HawkUser,
};
