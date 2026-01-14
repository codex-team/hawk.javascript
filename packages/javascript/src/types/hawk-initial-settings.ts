import type { EventContext, AffectedUser, Breadcrumb } from '@hawk.so/types';
import type { HawkJavaScriptEvent } from './event';
import type { BreadcrumbHint } from '../addons/breadcrumbs';

/**
 * JS Catcher initial settings
 */
export interface HawkInitialSettings {
  /**
   * User project's Integration Token
   */
  token: string;

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vue?: any;

  /**
   * Do not initialize global errors handling
   * This options still allow you send events manually
   */
  disableGlobalErrorsHandling?: boolean;

  /**
   * This Method allows you to filter any data you don't want sending to Hawk.
   *
   * Return `false` to prevent the event from being sent to Hawk.
   */
  beforeSend?(event: HawkJavaScriptEvent): HawkJavaScriptEvent | false;

  /**
   * Disable Vue.js error handler
   *
   * Used by @hawk.so/nuxt since Nuxt has own error hook.
   */
  disableVueErrorHandler?: boolean;

  /**
   * Console log handler
   */
  consoleTracking?: boolean;

  /**
   * Maximum number of breadcrumbs to store (FIFO)
   *
   * @default 15
   */
  maxBreadcrumbs?: number;

  /**
   * Enable automatic fetch/XHR breadcrumbs
   *
   * @default true
   */
  trackFetch?: boolean;

  /**
   * Enable automatic navigation breadcrumbs (history API)
   *
   * @default true
   */
  trackNavigation?: boolean;

  /**
   * Enable automatic UI click breadcrumbs
   *
   * @default false
   */
  trackClicks?: boolean;

  /**
   * Hook called before each breadcrumb is stored
   * Return null to discard the breadcrumb
   * Return modified breadcrumb to store it (useful for PII filtering)
   */
  beforeBreadcrumb?: (breadcrumb: Breadcrumb, hint?: BreadcrumbHint) => Breadcrumb | null;
}
