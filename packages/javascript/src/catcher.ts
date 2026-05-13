import './modules/element-sanitizer';
import Socket from './modules/socket';
import type { HawkInitialSettings } from './types';
import { isPerformanceIssueDetectorEnabled } from './types/issues';
import { VueIntegration } from './integrations/vue';
import type { VueIntegrationAddons } from '@hawk.so/types';
import type { JavaScriptCatcherIntegrations } from '@/types';
import { ConsoleCatcher } from './addons/consoleCatcher';
import { BrowserBreadcrumbStore } from './addons/breadcrumbs';
import { BaseCatcher, HawkUserManager, isLoggerSet, log, setLogger, decodeIntegrationId } from '@hawk.so/core';
import { HawkLocalStorage } from './utils/hawk-local-storage';
import { createBrowserLogger } from './utils/logger';
import { BrowserRandomGenerator } from './utils/random';
import { BrowserAddonMessageProcessor } from './addons/browser-addon-message-processor';
import { ConsoleOutputAddonMessageProcessor } from './addons/console-output-addon-message-processor';
import { DebugAddonMessageProcessor } from './addons/debug-addon-message-processor';
import { BrowserBreadcrumbsMessageProcessor } from './addons/browser-breadcrumbs-message-processor';
import { PerformanceIssuesMonitor } from './addons/performance-issues';

/**
 * Allow to use global VERSION, that will be overwritten by Webpack
 */
declare const VERSION: string;

/**
 * Registers a global logger instance if not already done.
 */
if (!isLoggerSet()) {
  setLogger(createBrowserLogger(VERSION));
}

/**
 * Hawk JavaScript Catcher
 * Module for errors and exceptions tracking
 *
 * @copyright CodeX
 */
export default class Catcher extends BaseCatcher<typeof Catcher.type> {
  /**
   * JS Catcher version
   */
  public readonly version: string = VERSION;

  /**
   * Vue.js integration instance
   */
  public vue: VueIntegration | null = null;

  /**
   * Catcher Type
   */
  private static readonly type = 'errors/javascript' as const;

  /**
   * Enable debug mode
   */
  private readonly debug: boolean;

  /**
   * Disable Vue.js error handler
   */
  private readonly disableVueErrorHandler: boolean = false;

  /**
   * Console log handler
   */
  private readonly consoleTracking: boolean;

  /**
   * Console catcher instance
   */
  private readonly consoleCatcher: ConsoleCatcher | null = null;

  /**
   * Issues monitor instance
   */
  private issuesMonitor: PerformanceIssuesMonitor | null = null;

  /**
   * Catcher constructor
   *
   * @param {HawkInitialSettings|string} settings - If settings is a string, it means an Integration Token
   */
  constructor(settings: HawkInitialSettings | string) {
    if (typeof settings === 'string') {
      settings = {
        token: settings,
      } as HawkInitialSettings;
    }

    const token = settings.token;
    const userManager = new HawkUserManager(
      new HawkLocalStorage(),
      new BrowserRandomGenerator()
    );
    /**
     * Init transport
     * WebSocket decorator by default, or custom via {@link settings.transport}
     * No-op when token is missing
     */
    const transport = !token
      ? { send: (): Promise<void> => Promise.resolve() }
      : settings.transport ?? new Socket({
        collectorEndpoint: settings.collectorEndpoint || `wss://${decodeIntegrationId(token)}.k1.hawk.so:443/ws`,
        connectionIdleMs: settings.reconnectionTimeout,
        onClose(): void {
          log(
            'Connection lost. Connection will be restored when new errors occurred',
            'info'
          );
        },
      });

    let breadcrumbStore: BrowserBreadcrumbStore | null = null;

    if (token && settings.breadcrumbs !== false) {
      breadcrumbStore = BrowserBreadcrumbStore.getInstance();
    }

    super(
      token,
      transport,
      userManager,
      settings.release !== undefined ? String(settings.release) : undefined,
      settings.context || undefined,
      settings.beforeSend,
      breadcrumbStore ?? undefined
    );

    this.debug = settings.debug || false;
    if (settings.user) {
      this.setUser(settings.user);
    }
    this.disableVueErrorHandler =
      settings.disableVueErrorHandler !== null && settings.disableVueErrorHandler !== undefined
        ? settings.disableVueErrorHandler
        : false;
    this.consoleTracking =
      settings.consoleTracking !== null && settings.consoleTracking !== undefined
        ? settings.consoleTracking
        : true;


    if (!token) {
      log(
        'Integration Token is missed. You can get it on https://hawk.so at Project Settings.',
        'warn'
      );

      return;
    }

    this.addMessageProcessor(new BrowserAddonMessageProcessor());

    if (this.consoleTracking) {
      this.consoleCatcher = ConsoleCatcher.getInstance();
      this.addMessageProcessor(new ConsoleOutputAddonMessageProcessor(this.consoleCatcher));
    }

    // Initialize breadcrumbs
    if (settings.breadcrumbs !== false) {
      this.addMessageProcessor(new BrowserBreadcrumbsMessageProcessor(settings.breadcrumbs ?? {}));
    }

    if (this.debug) {
      this.addMessageProcessor(new DebugAddonMessageProcessor());
    }

    this.configureIssues(settings);

    if (settings.vue) {
      this.connectVue(settings.vue);
    }
  }

  /**
   * Method for Frameworks SDK using own error handlers.
   * Allows to send errors to Hawk with additional Frameworks data (addons)
   *
   * @param error - error to send
   * @param addons - framework-specific data, can be undefined
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public captureError(error: Error | string, addons?: JavaScriptCatcherIntegrations): void {
    void this.formatAndSend(error, addons);
  }

  /**
   * Add error handing to the passed Vue app
   *
   * @param vue - Vue app
   */
  public connectVue(vue): void {
    // eslint-disable-next-line no-new
    this.vue = new VueIntegration(
      vue,
      (error: Error, addons: VueIntegrationAddons) => {
        void this.formatAndSend(error, {
          vue: addons,
        });
      },
      {
        disableVueErrorHandler: this.disableVueErrorHandler,
      }
    );
  }

  /**
   * Returns {@link Catcher.type}
   */
  protected getCatcherType(): typeof Catcher.type {
    return Catcher.type;
  }

  /**
   * Returns catcher version
   */
  protected getCatcherVersion(): string {
    return VERSION;
  }

  /**
   * Configure issues-related features:
   * - global errors handling
   * - performance issue detectors (Long Tasks / LoAF)
   *
   * @param settings
   */
  private configureIssues(settings: HawkInitialSettings): void {
    if (settings.issues === false) {
      return;
    }

    const issues = settings.issues ?? {};
    const shouldHandleGlobalErrors = settings.disableGlobalErrorsHandling !== true && issues.errors !== false;
    const shouldDetectPerformanceIssues = isPerformanceIssueDetectorEnabled(issues.longTasks)
      || isPerformanceIssueDetectorEnabled(issues.longAnimationFrames)
      || isPerformanceIssueDetectorEnabled(issues.webVitals);

    if (shouldHandleGlobalErrors) {
      this.initGlobalHandlers();
    }

    if (shouldDetectPerformanceIssues) {
      this.issuesMonitor ??= new PerformanceIssuesMonitor();
      this.issuesMonitor.init(issues, (entry) => {
        void this.formatAndSend(entry.title, entry.addons);
      });
    }
  }

  /**
   * Init global errors handler
   */
  private initGlobalHandlers(): void {
    window.addEventListener('error', (event: ErrorEvent) => this.handleEvent(event));
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => this.handleEvent(event));
  }

  /**
   * Handles the event and sends it to the server
   *
   * @param {ErrorEvent|PromiseRejectionEvent} event — (!) both for Error and Promise Rejection
   */
  private async handleEvent(event: ErrorEvent | PromiseRejectionEvent): Promise<void> {
    // Add error to console logs
    if (this.consoleTracking) {
      this.consoleCatcher!.addErrorEvent(event);
    }
    /**
     * Promise rejection reason is recommended to be an Error, but it can be a string:
     * - Promise.reject(new Error('Reason message')) ——— recommended
     * - Promise.reject('Reason message')
     */
    let error = (event as ErrorEvent).error || (event as PromiseRejectionEvent).reason;

    /**
     * Case when error triggered in external script
     * We can't access event error object because of CORS
     * Event message will be 'Script error.'
     */
    if (event instanceof ErrorEvent && error === undefined) {
      error = (event as ErrorEvent).message;
    }

    void this.formatAndSend(error);
  }
}
