import Socket from './modules/socket';
import log from './modules/logger';
import StackParser from './modules/stackParser';
import { HawkInitialSettings } from '../types/hawk-initial-settings';
import { BacktraceFrame, HawkEvent, HawkUser } from '../types/hawk-event';

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
   * Catcher Type
   */
  private readonly type: string = 'errors/javascript';

  /**
   * User project's Integration Token
   */
  private readonly token: string;

  /**
   * Current bundle version
   */
  private readonly release: string;

  /**
   * Current authenticated user
   */
  private readonly user: HawkUser;

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
   * Catcher constructor
   * @param {HawkInitialSettings|string} settings - If settings is a string, it means an Integration Token
   */
  constructor(settings: HawkInitialSettings | string) {
    if (typeof settings === 'string') {
      settings = {
        token: settings,
      } as HawkInitialSettings;
    }

    this.token = settings.token;
    this.release = settings.release;
    this.user = settings.user;

    if (!this.token) {
      log(
        'Integration Token is missed. You can get it on https://hawk.so at Project Settings.',
        'warn',
      );
      return;
    }

    /**
     * Init transport
     */
    this.transport = new Socket({
      collectorEndpoint: settings.collectorEndpoint || 'wss://k1.hawk.so:443/ws',
      reconnectionAttempts: settings.reconnectionAttempts,
      reconnectionTimeout: settings.reconnectionTimeout,
      onClose() {
        log(
          'Connection lost. Connection will be restored when new errors occurred',
          'info',
        );
      },
    });

    /**
     * Set handlers
     */
    this.initGlobalHandlers();
  }

  /**
   * Init global errors handler
   */
  public initGlobalHandlers() {
    window.addEventListener('error', (event: ErrorEvent) => this.handleEvent(event));
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => this.handleEvent(event));
  }

  /**
   * Send test event from client
   */
  public test() {
    const fakeEvent = new Error('Hawk JavaScript Catcher test message.');

    this.catchError(fakeEvent);
  }

  /**
   * This method prepares and sends an Error to Hawk
   * User can fire it manually on try-catch
   */
  public async catchError(error: Error) {
    try {
      const errorFormatted = await this.prepareErrorFormatted(error);

      this.sendErrorFormatted(errorFormatted);
    } catch (formattingError) {
      log('Internal error ლ(´ڡ`ლ)', 'error', formattingError);
    }
  }

  /**
   * Handles the event and sends it to the server
   * @param {ErrorEvent|PromiseRejectionEvent} event — (!) both for Error and Promise Rejection
   */
  private async handleEvent(event: ErrorEvent | PromiseRejectionEvent) {
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

    try {
      const errorFormatted = await this.prepareErrorFormatted(error);

      this.sendErrorFormatted(errorFormatted);
    } catch (formattingError) {
      log('Internal error ლ(´ڡ`ლ)', 'error', formattingError);
    }
  }

  /**
   * Sends formatted HawkEvent to the Collector
   */
  private sendErrorFormatted(errorFormatted: HawkEvent): void {
    this.transport.send(errorFormatted)
      .catch(((sendingError) => {
        log('WebSocket sending error', 'error', sendingError);
      }));
  }

  /**
   * Formats the event
   */
  private async prepareErrorFormatted(error: Error|string): Promise<HawkEvent> {
    return {
      token: this.token,
      catcherType: this.type,
      payload: {
        title: this.getTitle(error),
        release: this.getRelease(),
        timestamp: this.getTime(),
        context: this.getContext(),
        user: this.getUser(),
        get: this.getGetParams(),
        addons: this.getAddons(),
        backtrace: await this.getBacktrace(error),
      },
    };
  }

  /**
   * Return event title
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
   * Release version
   */
  private getRelease(): string | null {
    return this.release || null;
  }

  /**
   * Current timestamp
   */
  private getTime(): number {
    let timestamp = (new Date()).getTime();
    /**
     * Convert JS timestamp to Unix timestamp
     */
    timestamp = timestamp / 1000;

    return timestamp;
  }

  /**
   * Collects additional information
   */
  private getContext(): object {
    return {};
  }

  /**
   * Current authenticated user
   */
  private getUser(): HawkUser | null  {
    return this.user || null;
  }

  /**
   * Get parameters
   */
  private getGetParams(): object | null {
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
   */
  private async getBacktrace(error: Error|string): Promise<BacktraceFrame[]|null> {
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
    } catch (error) {
      log('Can not parse stack:', 'warn', error);
      return null;
    }
  }

  /**
   * Return some details
   */
  private getAddons(): object {
    const { innerWidth, innerHeight }  = window;
    const userAgent = window.navigator.userAgent;

    return {
        window: {
          innerWidth,
          innerHeight,
        },
        userAgent,
      };
  }
}
