import type { EventContext, AffectedUser } from '@hawk.so/types';
import type { HawkJavaScriptEvent } from './event';
import type { Transport } from './transport';
import type { BreadcrumbsOptions } from '../addons/breadcrumbs';
import type { MainThreadBlockingOptions } from '../addons/longTasks';

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
   * - Return modified event — it will be sent instead of the original.
   * - Return `false` — the event will be dropped entirely.
   * - Any other value is invalid — the original event is sent as-is (a warning is logged).
   */
  beforeSend?(event: HawkJavaScriptEvent): HawkJavaScriptEvent | false | void;

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
   * Breadcrumbs configuration
   * Pass false to disable breadcrumbs entirely
   * Pass options object to configure breadcrumbs behavior
   *
   * @default enabled with default options
   */
  breadcrumbs?: false | BreadcrumbsOptions;

  /**
   * Custom transport for sending events.
   * If not provided, default WebSocket transport is used.
   */
  transport?: Transport;

  /**
   * Main-thread blocking detection.
   * Observes Long Tasks and Long Animation Frames (LoAF) via PerformanceObserver
   * and sends a dedicated event when blocking is detected.
   *
   * This is an umbrella option by design: Long Tasks and LoAF describe the same
   * domain (main-thread blocking), so both toggles live under one config key.
   *
   * Chromium-only (Chrome, Edge). On unsupported browsers the observers
   * simply won't start — no errors, no overhead.
   *
   * Pass `false` to disable entirely.
   * Pass an options object to toggle individual observers.
   *
   * @default enabled with default options (both longTasks and longAnimationFrames on)
   */
  mainThreadBlocking?: false | MainThreadBlockingOptions;
}
