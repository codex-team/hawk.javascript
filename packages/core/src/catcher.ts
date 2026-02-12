import { AffectedUser, EventContext, Json } from "@hawk.so/types";
import { validateContext, validateUser } from "./utils/validation";
import { Logger, LogType } from "./utils/log";
import { HawkInitialSettings } from "./types/base-hawk-settings";
import { HawkJavaScriptEvent } from "./types/event";
import Sanitizer from "./modules/sanitizer";
import { Transport } from "./types/transport";
import { UserManager } from "./types/user-manager";
import { isErrorProcessed, markErrorAsProcessed } from "./utils/event";
import { CatcherMessage } from "./types/catcher-message";
import log from "@hawk.so/javascript/dist/utils/log";
import { EventRejectedError } from "./errors";

export abstract class BaseCatcher {

  /**
   * Catcher Type
   */
  protected readonly type: string;

  /**
   * Current bundle version
   */
  private readonly release: string | undefined;

  /**
   * Any additional data passed by user for sending with all messages
   */
  private context: EventContext | undefined;

  /**
   * Transport for dialog between Catcher and Collector
   * (WebSocket decorator by default, or custom via settings.transport)
   */
  private readonly transport: Transport;

  /**
   * Current authenticated user manager
   */
  private readonly userManager: UserManager;

  /**
   * Logger function
   */
  private readonly log: Logger;

  constructor(
    settings: HawkInitialSettings,
  ) {
    this.release = settings.release;
    this.userManager = settings.userManager;
    this.log = (settings.logger ?? (() => {
    })) as Logger;
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
    void this.formatAndSend(message, context);
  }

  /**
   * Format and send an error
   *
   * @param error - error to send
   * @param integrationAddons - addons spoiled by Integration
   * @param context - any additional data passed by user
   */
  protected async formatAndSend(
    error: Error | string,
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
        markErrorAsProcessed(error, this.log);
      }

      const errorFormatted = await this.prepareErrorFormatted(error, context);

      this.sendErrorFormatted(errorFormatted);
    } catch (e) {
      if (e instanceof EventRejectedError) {
        /**
         * Event was rejected by user
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
        log('Transport sending error', 'error', sendingError);
      });
  }

  /**
   * Formats the event
   *
   * @param error - error to format
   * @param context - any additional data passed by user
   */
  abstract async prepareErrorFormatted(error: Error | string, context?: EventContext): Promise<CatcherMessage>

  /**
   * Update the current user information
   *
   * @param user - New user information
   */
  public setUser(user: AffectedUser): void {
    if (!validateUser(user, this.log)) {
      return;
    }

    this.userManager.setUser(user);
  }

  /**
   * Update the context data that will be sent with all events
   *
   * @param context - New context data
   */
  public setContext(context: EventContext | undefined): void {
    if (!validateContext(context, this.log)) {
      return;
    }

    this.context = context;
  }

  /**
   * Return event type: TypeError, ReferenceError etc
   *
   * @param error - caught error
   */
  protected getType(error: Error | string): HawkJavaScriptEvent['type'] {
    if (!(error instanceof Error)) {
      return null;
    }

    return error.name;
  }

  /**
   * Release version
   */
  protected getRelease(): HawkJavaScriptEvent['release'] {
    return this.release !== undefined ? String(this.release) : null;
  }

  /**
   * Current authenticated user
   */
  protected getUser(): HawkJavaScriptEvent['user'] {
    return this.userManager.getUser();
  }

  /**
   * Collects additional information
   *
   * @param context - any additional data passed by user
   */
  protected getContext(context?: EventContext): HawkJavaScriptEvent['context'] {
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
   * Compose raw data object
   *
   * @param {Error|string} error — caught error
   */
  protected getRawData(error: Error | string): Json | undefined {
    if (!(error instanceof Error)) {
      return;
    }

    const stack = error.stack !== undefined ? error.stack : '';

    return {
      name: error.name,
      message: error.message,
      stack,
    };
  }

  /**
   * Return event title
   *
   * @param error - event from which to get the title
   */
  protected getTitle(error: Error | string): string {
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
}
