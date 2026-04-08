import type {
  AffectedUser,
  BacktraceFrame,
  CatcherMessage,
  CatcherMessagePayload,
  CatcherMessageType,
  EncodedIntegrationToken,
  EventContext
} from '@hawk.so/types';
import type { ErrorsCatcherType } from '@hawk.so/types/src/catchers/catcher-message';
import type { Transport } from './transports/transport';
import type { BreadcrumbStore } from './breadcrumbs/breadcrumb-store';
import type { MessageProcessor, ProcessingPayload } from './messages/message-processor';
import { StackParser } from './modules/stack-parser';
import type { HawkUserManager } from './users/hawk-user-manager';
import { validateContext, validateUser, isValidEventPayload } from './utils/validation';
import { isErrorProcessed, markErrorAsProcessed } from './utils/event';
import { Sanitizer } from './modules/sanitizer';
import { log } from './logger/logger';

/**
 * User-supplied hook to filter or modify events before sending.
 * - Return modified event — it will be sent instead of the original.
 * - Return `false` — the event will be dropped entirely.
 * - Any other value is invalid — the original event is sent as-is (a warning is logged).
 *
 * @typeParam T - catcher message type
 */
export type BeforeSendHook<T extends CatcherMessageType> = (event: CatcherMessagePayload<T>) => CatcherMessagePayload<T> | false | void;

/**
 * Abstract base class for all Hawk catchers.
 *
 * Contains env-agnostic logic for sending captured error events and managing related context.
 *
 * **Transport** — used to deliver * assembled {@link CatcherMessage} objects to Collector.
 * Provided via constructor.
 *
 * **User manager** — {@link HawkUserManager} resolves current affected user.
 * Provided via constructor so each environment can supply its own storage backend.
 *
 * **Breadcrumb store** — optional {@link BreadcrumbStore} passed via constructor.
 *
 * **Message processors** — pipeline of {@link MessageProcessor} instances
 * applied to every outgoing event. Environment-specific processors may be provided
 * via {@link addMessageProcessor}.
 *
 * Each {@link formatAndSend} call initiates **sending pipeline** which consist of following steps:
 * - base payload is built,
 * - sequentially apply message processors to payload
 * - apply optional {@link BeforeSendHook},
 * - dispatch message via {@link Transport}.
 *
 * Subclasses must implement {@link getCatcherType} and {@link getCatcherVersion}
 * (they are used for building base payload during sending pipeline).
 *
 * @typeParam T - catcher message type this catcher handles
 */
export abstract class BaseCatcher<T extends ErrorsCatcherType> {
  /**
   * Integration token used to identify the project
   */
  private readonly token: EncodedIntegrationToken;

  /**
   * Transport for dialog between Catcher and Collector
   */
  private readonly transport: Transport<T>;

  /**
   * Manages currently authenticated user identity
   */
  private readonly userManager: HawkUserManager;

  /**
   * Any additional data passed by user for sending with all messages
   */
  private context?: EventContext;

  /**
   * Current bundle version
   */
  private readonly release?: string;

  /**
   * This method allows developer to filter any data you don't want sending to Hawk.
   * - Return modified event — it will be sent instead of the original.
   * - Return `false` — the event will be dropped entirely.
   * - Any other value is invalid — the original event is sent as-is (a warning is logged).
   */
  private readonly beforeSend?: BeforeSendHook<T>;

  /**
   * Breadcrumb store instance
   */
  private readonly breadcrumbStore?: BreadcrumbStore;

  /**
   * List of message processors applied to every outgoing event message.
   */
  private readonly messageProcessors: MessageProcessor<T>[] = [];

  /**
   * Module for parsing backtrace
   */
  private readonly stackParser: StackParser = new StackParser();

  /**
   * @param token - encoded integration token identifying the project
   * @param transport - transport used to deliver events to Collector
   * @param userManager - manages current affected user identity
   * @param release - optional bundle release version attached to every event
   * @param context - optional global context merged into every event
   * @param beforeSend - optional hook to filter or modify events before sending
   * @param breadcrumbStore - optional breadcrumb store
   */
  protected constructor(
    token: EncodedIntegrationToken,
    transport: Transport<T>,
    userManager: HawkUserManager,
    release?: string,
    context?: EventContext,
    beforeSend?: BeforeSendHook<T>,
    breadcrumbStore?: BreadcrumbStore
  ) {
    this.token = token;
    this.transport = transport;
    this.userManager = userManager;
    this.release = release;
    this.beforeSend = beforeSend;
    this.breadcrumbStore = breadcrumbStore;
    this.setContext(context);
  }

  /**
   * Send test event from client
   */
  public test(): void {
    this.send(new Error('Hawk JavaScript Catcher test message.'));
  }

  /**
   * Public method for manual sending messages to the Hawk.
   * Can be called in user's try-catch blocks or by other custom logic.
   *
   * @param message - what to send
   * @param context - any additional data to send
   */
  public send(message: Error | string, context?: EventContext): void {
    void this.formatAndSend(message, undefined, context);
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
   * Add message processor to the pipeline.
   *
   * @param processors - processors to add
   */
  protected addMessageProcessor(...processors: MessageProcessor<T>[]): void {
    this.messageProcessors.push(...processors);
  }

  /**
   * Process and sends error message.
   *
   * Returns early without sending if:
   * - error was already processed,
   * - a message processor drops it,
   * - {@link beforeSend} hook rejects it.
   *
   * @param error - error to send
   * @param integrationAddons - addons passed by integration (e.g. Vue, Nuxt)
   * @param context - any additional data passed by user
   */
  protected async formatAndSend(
    error: Error | string,
    integrationAddons?: Record<string, unknown>,
    context?: EventContext
  ): Promise<void> {
    try {
      if (isErrorProcessed(error)) {
        return;
      }

      markErrorAsProcessed(error);

      let processingPayload = await this.buildBasePayload(error, context);

      for (const processor of this.messageProcessors) {
        const result = processor.apply(processingPayload, error);

        if (result === null) {
          // Event was rejected by user using the beforeSend method
          return;
        }

        processingPayload = result;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = processingPayload as any as CatcherMessagePayload<T>;

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
        catcherType: this.getCatcherType(),
        payload: filtered,
      } as CatcherMessage<T>);
    } catch (e) {
      log('Unable to send error. Seems like it is Hawk internal bug. Please, report it here: https://github.com/codex-team/hawk.javascript/issues/new', 'warn', e);
    }
  }

  /**
   * Builds base event payload with core fields (title, type, backtrace, user, context, release).
   *
   * @param error - caught error or string reason
   * @param context - per-call context to merge with instance-level context
   * @returns base payload with core data
   */
  private async buildBasePayload(
    error: Error | string,
    context?: EventContext
  ): Promise<ProcessingPayload<T>> {
    return {
      title: this.getTitle(error),
      type: this.getType(error),
      release: this.getRelease(),
      context: this.getContext(context),
      user: this.getUser(),
      backtrace: await this.getBacktrace(error),
      catcherVersion: this.getCatcherVersion(),
      addons: {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as unknown as ProcessingPayload<T>;
  }

  /**
   * Clones payload and applies user-supplied {@link beforeSend} hook against it.
   *
   * @param payload - processed event message payload
   * @returns possibly modified payload, or null if the event should be dropped
   */
  private applyBeforeSendHook(
    payload: CatcherMessagePayload<T>
  ): CatcherMessagePayload<T> | null {
    if (typeof this.beforeSend !== 'function') {
      return payload;
    }

    let clone: CatcherMessagePayload<T>;

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
      return result as CatcherMessagePayload<T>;
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
  private sendMessage(message: CatcherMessage<T>): void {
    this.transport.send(message)
      .catch((e) => log('Transport sending error', 'error', e));
  }

  /**
   * Return event title.
   *
   * @param error - event from which to get the title
   */
  private getTitle(error: Error | string): string {
    const notAnError = !(error instanceof Error);

    // Case when error is 'reason' of PromiseRejectionEvent
    // and reject() provided with text reason instead of Error()
    if (notAnError) {
      return error.toString();
    }

    return error.message;
  }

  /**
   * Return event type: TypeError, ReferenceError etc.
   *
   * @param error - caught error
   */
  private getType(error: Error | string): string | undefined {
    const notAnError = !(error instanceof Error);

    // Case when error is 'reason' of PromiseRejectionEvent
    // and reject() provided with text reason instead of Error()
    if (notAnError) {
      return undefined;
    }

    return error.name;
  }

  /**
   * Release version
   */
  private getRelease(): string | undefined {
    return this.release;
  }

  /**
   * Collects additional information.
   *
   * @param context - any additional data passed by user
   */
  private getContext(context?: EventContext): EventContext | undefined {
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
   * Return parsed backtrace information.
   *
   * @param error - event from which to get backtrace
   */
  private async getBacktrace(error: Error | string): Promise<BacktraceFrame[] | undefined> {
    const notAnError = !(error instanceof Error);


    // Case when error is 'reason' of PromiseRejectionEvent
    // and reject() provided with text reason instead of Error()
    if (notAnError) {
      return undefined;
    }

    try {
      return await this.stackParser.parse(error);
    } catch (e) {
      log('Can not parse stack:', 'warn', e);

      return undefined;
    }
  }

  /**
   * Returns the catcher type identifier.
   *
   * @example 'errors/javascript'
   */
  protected abstract getCatcherType(): T;

  /**
   * Returns the catcher version string.
   */
  protected abstract getCatcherVersion(): string;
}
