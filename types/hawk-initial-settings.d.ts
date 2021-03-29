/**
 * JS Catcher initial settings
 */
import { EventContext, AffectedUser } from '../../../types';

export interface HawkInitialSettings {
  /**
   * User project's Integration Token
   */
  token: string;

  /**
   * Enable debug mode
   * Send raw event's data additionally in addons field by key 'RAW_EVENT_DATA'
   */
  debug: boolean;

  /**
   * Current release and bundle version
   */
  release?: string;

  /**
   * Current user information
   */
  user?: AffectedUser;

  /**
   * Any additional data you want to send with every event
   */
  context?: EventContext;

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
   *
   * @example ws://localhost:3000/ws
   */
  collectorEndpoint?: string;

  /**
   * Instance of a vue application
   * to handle its errors
   */
  vue?: any;

  /**
   * Do not initialize global errors handling
   * This options still allow you send events manually
   */
  disableGlobalErrorsHandling?: boolean;
}

export {
  AffectedUser
};
