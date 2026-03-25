import './modules/element-sanitizer';
import Socket from './modules/socket';
import type { CatcherMessage, HawkInitialSettings, HawkJavaScriptEvent, Transport } from './types';
import { VueIntegration } from './integrations/vue';
import type {
  AffectedUser,
  CatcherMessagePayload,
  DecodedIntegrationToken,
  EncodedIntegrationToken,
  EventContext,
  VueIntegrationAddons
} from '@hawk.so/types';
import type { JavaScriptCatcherIntegrations } from '@/types';
import { ConsoleCatcher } from './addons/consoleCatcher';
import { BrowserBreadcrumbStore } from './addons/breadcrumbs';
import type { BreadcrumbStore, MessageProcessor } from '@hawk.so/core';
import {
  BreadcrumbsMessageProcessor,
  HawkUserManager,
  isErrorProcessed,
  isLoggerSet,
  isValidEventPayload,
  log,
  markErrorAsProcessed,
  Sanitizer,
  setLogger,
  StackParser,
  validateContext,
  validateUser
} from '@hawk.so/core';
import { HawkLocalStorage } from './storages/hawk-local-storage';
import { createBrowserLogger } from './logger/logger';
import { BrowserRandomGenerator } from './utils/random';
import { BrowserMessageProcessor } from './messages/browser-message-processor';
import { ConsoleCatcherMessageProcessor } from './messages/console-catcher-message-processor';
import { DebugMessageProcessor } from './messages/debug-message-processor';

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
export default class Catcher {
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
   * User project's Integration Token
   */
  private readonly token: EncodedIntegrationToken;

  /**
   * Enable debug mode
   */
  private readonly debug: boolean;

  /**
   * Current bundle version
   */
  private readonly release: string | undefined;

  /**
   * Any additional data passed by user for sending with all messages
   */
  private context: EventContext | undefined;

  /**
   * This Method allows developer to filter any data you don't want sending to Hawk.
   * - Return modified event — it will be sent instead of the original.
   * - Return `false` — the event will be dropped entirely.
   * - Any other value is invalid — the original event is sent as-is (a warning is logged).
   */
  private readonly beforeSend: undefined | ((event: HawkJavaScriptEvent<typeof Catcher.type>) => HawkJavaScriptEvent<typeof Catcher.type> | false | void);

  /**
   * Transport for dialog between Catcher and Collector
   * (WebSocket decorator by default, or custom via settings.transport)
   */
  private readonly transport: Transport<typeof Catcher.type>;

  /**
   * Module for parsing backtrace
   */
  private readonly stackParser: StackParser = new StackParser();

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
   * Breadcrumb manager instance
   */
  private readonly breadcrumbStore: BrowserBreadcrumbStore | null;

  /**
   * Manages currently authenticated user identity.
   */
  private readonly userManager: HawkUserManager = new HawkUserManager(
    new HawkLocalStorage(),
    new BrowserRandomGenerator()
  );

  /**
   * Ordered list of message processors applied to every outgoing event message.
   */
  private readonly messageProcessors: MessageProcessor<typeof Catcher.type>[];

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

    this.token = settings.token;
    this.debug = settings.debug || false;
    this.release = settings.release !== undefined ? String(settings.release) : undefined;
    if (settings.user) {
      this.setUser(settings.user);
    }
    this.setContext(settings.context || undefined);
    this.beforeSend = settings.beforeSend;
    this.disableVueErrorHandler =
      settings.disableVueErrorHandler !== null && settings.disableVueErrorHandler !== undefined
        ? settings.disableVueErrorHandler
        : false;
    this.consoleTracking =
      settings.consoleTracking !== null && settings.consoleTracking !== undefined
        ? settings.consoleTracking
        : true;
    this.messageProcessors = [
      new BrowserMessageProcessor(),
    ];

    if (!this.token) {
      log(
        'Integration Token is missed. You can get it on https://hawk.so at Project Settings.',
        'warn'
      );

      return;
    }

    /**
     * Init transport
     */
    this.transport = settings.transport ?? new Socket({
      collectorEndpoint: settings.collectorEndpoint || `wss://${this.getIntegrationId()}.k1.hawk.so:443/ws`,
      reconnectionAttempts: settings.reconnectionAttempts,
      reconnectionTimeout: settings.reconnectionTimeout,
      onClose(): void {
        log(
          'Connection lost. Connection will be restored when new errors occurred',
          'info'
        );
      },
    });

    if (this.consoleTracking) {
      this.consoleCatcher = ConsoleCatcher.getInstance();
      this.messageProcessors.push(new ConsoleCatcherMessageProcessor(this.consoleCatcher));
    }

    /**
     * Initialize breadcrumbs
     */
    if (settings.breadcrumbs !== false) {
      this.breadcrumbStore = BrowserBreadcrumbStore.getInstance();
      this.breadcrumbStore.init(settings.breadcrumbs ?? {});
      this.messageProcessors.push(new BreadcrumbsMessageProcessor());
    } else {
      this.breadcrumbStore = null;
    }

    if (this.debug) {
      this.messageProcessors.push(new DebugMessageProcessor());
    }

    /**
     * Set global handlers
     */
    if (!settings.disableGlobalErrorsHandling) {
      this.initGlobalHandlers();
    }

    if (settings.vue) {
      this.connectVue(settings.vue);
    }
  }

  /**
   * Send test event from client
   */
  public test(): void {
    const fakeEvent = new Error('Hawk JavaScript Catcher test message.');

    this.send(fakeEvent);
  }

  /**
   * Public method for manual sending messages to the Hawk
   * Can be called in user's try-catch blocks or by other custom logic
   *
   * @param message - what to send
   * @param [context] - any additional data to send
   */
  public send(message: Error | string, context?: EventContext): void {
    void this.formatAndSend(message, undefined, context);
  }

  /**
   * Method for Frameworks SDK using own error handlers.
   * Allows to send errors to Hawk with additional Frameworks data (addons)
   *
   * @param error - error to send
   * @param [addons] - framework-specific data, can be undefined
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
   * Update the current user information
   *
   * @param user - New user information
   */
  public setUser(user: AffectedUser): void {
    if (!validateUser(user)) {
      return;
    }

    this.userManager.setUser(user);
  }

  /**
   * Clear current user information
   */
  public clearUser(): void {
    this.userManager.clear();
  }

  /**
   * Breadcrumbs API - provides convenient access to breadcrumb methods
   *
   * @example
   * hawk.breadcrumbs.add({
   *   type: 'user',
   *   category: 'auth',
   *   message: 'User logged in',
   *   level: 'info',
   *   data: { userId: '123' }
   * });
   */
  public get breadcrumbs(): BreadcrumbStore {
    return {
      add: (breadcrumb, hint) => this.breadcrumbStore?.add(breadcrumb, hint),
      get: () => this.breadcrumbStore?.get() ?? [],
      clear: () => this.breadcrumbStore?.clear(),
    };
  }

  /**
   * Update the context data that will be sent with all events
   *
   * @param context - New context data
   */
  public setContext(context: EventContext | undefined): void {
    if (!validateContext(context)) {
      return;
    }

    this.context = context;
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
    /**
     * Add error to console logs
     */

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

  /**
   * Process and sends error message.
   *
   * Returns early without sending either if
   * - error was already processed,
   * - message processor drops it
   * - {@link beforeSend} hook rejects it
   *
   * @param error - error to send
   * @param integrationAddons - addons spoiled by Integration
   * @param context - any additional data passed by user
   */
  private async formatAndSend(
    error: Error | string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    integrationAddons?: JavaScriptCatcherIntegrations,
    context?: EventContext
  ): Promise<void> {
    try {
      const isAlreadySentError = isErrorProcessed(error);

      if (isAlreadySentError) {
        /**
         * @todo add debug build and log this case
         */
        return;
      } else {
        markErrorAsProcessed(error);
      }

      const hint = { error,
        breadcrumbs: this.breadcrumbStore?.get() };
      let payload = await this.buildBasePayload(error, context);

      for (const processor of this.messageProcessors) {
        const result = processor.apply(payload, hint);

        if (result === null) {
          return;
        }

        payload = result;
      }

      if (integrationAddons) {
        payload.addons = {
          ...(payload.addons ?? {}),
          ...Sanitizer.sanitize(integrationAddons),
        };
      }

      const filtered = this.applyBeforeSendHook(payload);

      if (filtered === null) {
        return;
      }

      this.sendMessage({
        token: this.token,
        catcherType: Catcher.type,
        payload: filtered,
      } as CatcherMessage<typeof Catcher.type>);
    } catch (e) {
      log('Unable to send error. Seems like it is Hawk internal bug. Please, report it here: https://github.com/codex-team/hawk.javascript/issues/new', 'warn', e);
    }
  }

  /**
   * Builds base event payload with basic fields (title, type, backtrace, user, context, release).
   *
   * @param error - caught error or string reason
   * @param context - per-call context to merge with instance-level context
   * @returns base payload with core data
   */
  private async buildBasePayload(
    error: Error | string,
    context?: EventContext
  ): Promise<CatcherMessagePayload<typeof Catcher.type>> {
    return {
      title: this.getTitle(error),
      type: this.getType(error),
      release: this.getRelease(),
      context: this.getContext(context),
      user: this.getUser(),
      backtrace: await this.getBacktrace(error),
      catcherVersion: this.version,
    };
  }

  /**
   * Clones {@link payload} and applies user-supplied {@link beforeSend} hook against it.
   *
   * @param payload - processed event message payload
   * @returns possibly modified payload, or null if the event should be dropped
   */
  private applyBeforeSendHook(
    payload: CatcherMessagePayload<typeof Catcher.type>
  ): CatcherMessagePayload<typeof Catcher.type> | null {
    if (typeof this.beforeSend !== 'function') {
      return payload;
    }

    let clone: CatcherMessagePayload<typeof Catcher.type>;

    try {
      clone = structuredClone(payload);
    } catch {
      // structuredClone may fail on non-cloneable values (functions, DOM nodes, etc.)
      // Fall back to passing the original — hook may mutate it, but at least reporting won't crash
      clone = payload;
    }

    const result = this.beforeSend(clone);

    // false → drop event
    if (result === false) {
      return null;
    }

    // Valid event payload → use it instead of original
    if (isValidEventPayload(result)) {
      return result as CatcherMessagePayload<typeof Catcher.type>;
    }

    // Anything else is invalid — warn, payload stays untouched (hook only received a clone)
    log(
      'Invalid beforeSend value. It should return event or false. Event is sent without changes.',
      'warn'
    );

    return payload;
  }

  /**
   * Dispatches assembled message over configured transport.
   *
   * @param message - fully assembled catcher message ready to send
   */
  private sendMessage(message: CatcherMessage<typeof Catcher.type>): void {
    this.transport.send(message)
      .catch((e) => log('Transport sending error', 'error', e));
  }

  /**
   * Return event title
   *
   * @param error - event from which to get the title
   */
  private getTitle(error: Error | string): string {
    const notAnError = !(error instanceof Error);

    /**
     * Case when error is 'reason' of PromiseRejectionEvent
     * and reject() provided with text reason instead of Error()
     */
    if (notAnError) {
      return error.toString() as string;
    }

    return (error as Error).message;
  }

  /**
   * Return event type: TypeError, ReferenceError etc
   *
   * @param error - caught error
   */
  private getType(error: Error | string): HawkJavaScriptEvent['type'] {
    const notAnError = !(error instanceof Error);

    /**
     * Case when error is 'reason' of PromiseRejectionEvent
     * and reject() provided with text reason instead of Error()
     */
    if (notAnError) {
      return undefined;
    }

    return (error as Error).name;
  }

  /**
   * Release version
   */
  private getRelease(): HawkJavaScriptEvent['release'] {
    return this.release !== undefined ? String(this.release) : undefined;
  }

  /**
   * Returns integration id from integration token
   */
  private getIntegrationId(): string {
    try {
      const decodedIntegrationToken: DecodedIntegrationToken = JSON.parse(atob(this.token));
      const { integrationId } = decodedIntegrationToken;

      if (!integrationId || integrationId === '') {
        throw new Error();
      }

      return integrationId;
    } catch {
      throw new Error('Invalid integration token.');
    }
  }

  /**
   * Collects additional information
   *
   * @param context - any additional data passed by user
   */
  private getContext(context?: EventContext): HawkJavaScriptEvent['context'] {
    const contextMerged = {};

    if (this.context !== undefined) {
      Object.assign(contextMerged, this.context);
    }

    if (context !== undefined) {
      Object.assign(contextMerged, context);
    }

    return Sanitizer.sanitize(contextMerged);
  }

  /**
   * Returns the current user if set, otherwise generates and persists an anonymous ID.
   */
  private getUser(): AffectedUser {
    return this.userManager.getUser();
  }

  /**
   * Return parsed backtrace information
   *
   * @param error - event from which to get backtrace
   */
  private async getBacktrace(error: Error | string): Promise<HawkJavaScriptEvent['backtrace']> {
    const notAnError = !(error instanceof Error);

    /**
     * Case when error is 'reason' of PromiseRejectionEvent
     * and reject() provided with text reason instead of Error()
     */
    if (notAnError) {
      return undefined;
    }

    try {
      return await this.stackParser.parse(error as Error);
    } catch (e) {
      log('Can not parse stack:', 'warn', e);

      return undefined;
    }
  }
}
