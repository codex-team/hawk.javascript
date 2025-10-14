import Socket from './modules/socket';
import Sanitizer from './modules/sanitizer';
import log from './utils/log';
import StackParser from './modules/stackParser';
import type { CatcherMessage, HawkInitialSettings } from './types';
import { VueIntegration } from './integrations/vue';
import { id } from './utils/id';
import type {
  AffectedUser,
  EventContext,
  JavaScriptAddons,
  VueIntegrationAddons,
  Json, EncodedIntegrationToken, DecodedIntegrationToken
} from '@hawk.so/types';
import type { JavaScriptCatcherIntegrations } from './types/integrations';
import { EventRejectedError } from './errors';
import type { HawkJavaScriptEvent } from './types';
import { isErrorProcessed, markErrorAsProcessed } from './utils/event';
import { addErrorEvent, getConsoleLogStack, initConsoleCatcher } from './addons/consoleCatcher';
import { validateUser, validateContext, logValidationErrors } from './utils/validation';

/**
 * Allow to use global VERSION, that will be overwritten by Webpack
 */
declare const VERSION: string;

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
  private readonly type: string = 'errors/javascript';

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
   * Current authenticated user
   */
  private user: AffectedUser;

  /**
   * Any additional data passed by user for sending with all messages
   */
  private context: EventContext | undefined;

  /**
   * This Method allows developer to filter any data you don't want sending to Hawk
   * If method returns false, event will not be sent
   */
  private readonly beforeSend: undefined | ((event: HawkJavaScriptEvent) => HawkJavaScriptEvent | false);

  /**
   * Transport for dialog between Catcher and Collector
   * (WebSocket decorator)
   */
  private readonly transport: Socket;

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
    this.release = settings.release;
    this.user = settings.user || Catcher.getGeneratedUser();
    this.context = settings.context || undefined;
    this.beforeSend = settings.beforeSend;
    this.disableVueErrorHandler = settings.disableVueErrorHandler !== null && settings.disableVueErrorHandler !== undefined ? settings.disableVueErrorHandler : false;
    this.consoleTracking = settings.consoleTracking !== null && settings.consoleTracking !== undefined ? settings.consoleTracking : true;

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
    this.transport = new Socket({
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
      initConsoleCatcher();
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
   * Generates user if no one provided via HawkCatcher settings
   * After generating, stores user for feature requests
   */
  private static getGeneratedUser(): AffectedUser {
    let userId: string;
    const LOCAL_STORAGE_KEY = 'hawk-user-id';
    const storedId = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (storedId) {
      userId = storedId;
    } else {
      userId = id();
      localStorage.setItem(LOCAL_STORAGE_KEY, userId);
    }

    return {
      id: userId,
    };
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
    const validation = validateUser(user);

    if (!validation.isValid) {
      logValidationErrors('setUser', validation.errors);

      return;
    }

    this.user = validation.data!;
  }

  /**
   * Clear current user information (revert to generated user)
   */
  public clearUser(): void {
    this.user = Catcher.getGeneratedUser();
  }

  /**
   * Update the context data that will be sent with all events
   *
   * @param context - New context data
   */
  public setContext(context: EventContext): void {
    const validation = validateContext(context);

    if (!validation.isValid) {
      logValidationErrors('setContext', validation.errors);

      return;
    }

    this.context = validation.data!;
  }

  /**
   * Clear current context data
   */
  public clearContext(): void {
    this.context = undefined;
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
      addErrorEvent(event);
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
   * Format and send an error
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

      const errorFormatted = await this.prepareErrorFormatted(error, context);

      /**
       * If this event caught by integration (Vue or other), it can pass extra addons
       */
      if (integrationAddons) {
        this.appendIntegrationAddons(errorFormatted, Sanitizer.sanitize(integrationAddons));
      }

      this.sendErrorFormatted(errorFormatted);
    } catch (e) {
      if (e instanceof EventRejectedError) {
        /**
         * Event was rejected by user using the beforeSend method
         */
        return;
      }

      log('Unable to send error. Seems like it is Hawk internal bug. Please, report it here: https://github.com/codex-team/hawk.javascript/issues/new', 'warn', e);
    }
  }

  /**
   * Sends formatted HawkEvent to the Collector
   *
   * @param errorFormatted - formatted error to send
   */
  private sendErrorFormatted(errorFormatted: CatcherMessage): void {
    this.transport.send(errorFormatted)
      .catch((sendingError) => {
        log('WebSocket sending error', 'error', sendingError);
      });
  }

  /**
   * Formats the event
   *
   * @param error - error to format
   * @param context - any additional data passed by user
   */
  private async prepareErrorFormatted(error: Error | string, context?: EventContext): Promise<CatcherMessage> {
    let payload: HawkJavaScriptEvent = {
      title: this.getTitle(error),
      type: this.getType(error),
      release: this.getRelease(),
      context: this.getContext(context),
      user: this.getUser(),
      addons: this.getAddons(error),
      backtrace: await this.getBacktrace(error),
      catcherVersion: this.version,
    };

    /**
     * Filter sensitive data
     */
    if (typeof this.beforeSend === 'function') {
      const beforeSendResult = this.beforeSend(payload);

      if (beforeSendResult === false) {
        throw new EventRejectedError('Event rejected by beforeSend method.');
      } else {
        payload = beforeSendResult;
      }
    }

    return {
      token: this.token,
      catcherType: this.type,
      payload,
    };
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
      return null;
    }

    return (error as Error).name;
  }

  /**
   * Release version
   */
  private getRelease(): HawkJavaScriptEvent['release'] {
    return this.release || null;
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
   * Current authenticated user
   */
  private getUser(): HawkJavaScriptEvent['user'] {
    return this.user || null;
  }

  /**
   * Get parameters
   */
  private getGetParams(): Json | null {
    const searchString = window.location.search.substr(1);

    if (!searchString) {
      return null;
    }

    /**
     * Create object from get-params string
     */
    const pairs = searchString.split('&');

    return pairs.reduce((accumulator, pair) => {
      const [key, value] = pair.split('=');

      accumulator[key] = value;

      return accumulator;
    }, {});
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
      return null;
    }

    try {
      return await this.stackParser.parse(error as Error);
    } catch (e) {
      log('Can not parse stack:', 'warn', e);

      return null;
    }
  }

  /**
   * Return some details
   *
   * @param {Error|string} error — caught error
   */
  private getAddons(error: Error | string): HawkJavaScriptEvent['addons'] {
    const { innerWidth, innerHeight } = window;
    const userAgent = window.navigator.userAgent;
    const location = window.location.href;
    const getParams = this.getGetParams();
    const consoleLogs = this.consoleTracking && getConsoleLogStack();

    const addons: JavaScriptAddons = {
      window: {
        innerWidth,
        innerHeight,
      },
      userAgent,
      url: location,
    };

    if (getParams) {
      addons.get = getParams;
    }

    if (this.debug) {
      addons.RAW_EVENT_DATA = this.getRawData(error);
    }

    if (consoleLogs && consoleLogs.length > 0) {
      addons.consoleOutput = consoleLogs;
    }

    return addons;
  }

  /**
   * Compose raw data object
   *
   * @param {Error|string} error — caught error
   */
  private getRawData(error: Error | string): Json | undefined {
    if (!(error instanceof Error)) {
      return;
    }

    const stack = error.stack !== null && error.stack !== undefined ? error.stack : '';

    return {
      name: error.name,
      message: error.message,
      stack,
    };
  }

  /**
   * Extend addons object with addons spoiled by integration
   * This method mutates original event
   *
   * @param errorFormatted - Hawk event prepared for sending
   * @param integrationAddons - extra addons
   */
  private appendIntegrationAddons(errorFormatted: CatcherMessage, integrationAddons: JavaScriptCatcherIntegrations): void {
    Object.assign(errorFormatted.payload.addons, integrationAddons);
  }
}
