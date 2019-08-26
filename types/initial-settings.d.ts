/**
 * JS Catcher initial settings
 *
 * @copyright CodeX
 */
import { User } from './hawk-event';

export interface InitialSettings {
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
  user?: User;

  /**
   * Hawk Collector endpoint.
   * Can be overwritten for development purposes.
   * @example ws://localhost:3000/ws
   */
  collectorEndpoint?: string;

  /**
   * How many time we should try to reconnect when connection lost.
   */
  reconnectionAttempts?: number;

  /**
   * How many time we should wait between reconnection attempts.
   */
  reconnectionTimeout?: number;
}
