import {AffectedUser, EventContext} from "@hawk.so/types";
import {Transport} from "./transport";
import {Logger} from "vite";
import {UserManager} from "./user-manager";

/**
 * JS Catcher initial settings
 */
export interface HawkInitialSettings {
  /**
   * Enable debug mode
   * Send raw event's data additionally in addons field by key 'RAW_EVENT_DATA'
   */
  debug?: boolean;

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
   * Custom transport for sending events.
   * If not provided, default WebSocket transport is used.
   */
  transport: Transport;

  userManager: UserManager;

  logger?: Logger;
}
