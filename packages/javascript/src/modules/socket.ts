import type { Transport } from '@hawk.so/core';
import { log } from '@hawk.so/core';
import type { CatcherMessage } from '@/types';
import type { CatcherMessageType } from '@hawk.so/types';
import { singleFlight } from '../utils/single-flight';

/**
 * WebSocket close codes that represent an intentional, expected closure.
 * See: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
 */
const WS_CLOSE_NORMAL = 1000;
const WS_CLOSE_GOING_AWAY = 1001;

/**
 * Custom WebSocket wrapper class
 *
 * @copyright CodeX
 */
export default class Socket<T extends CatcherMessageType = 'errors/javascript'> implements Transport<T> {
  /**
   * Socket connection endpoint
   */
  private readonly url: string;

  /**
   * External handler for socket message
   */
  private readonly onMessage: (message: MessageEvent) => void;

  /**
   * External handler for socket opening
   */
  private readonly onOpen: (event: Event) => void;

  /**
   * External handler for socket close
   */
  private readonly onClose: (event: CloseEvent) => void;

  /**
   * Queue of events collected while socket is not connected.
   * They will be sent once the connection is established.
   */
  private eventsQueue: CatcherMessage<T>[];

  /**
   * Websocket instance
   */
  private ws: WebSocket | null;

  /**
   * Reconnection tryings Timeout
   */
  private reconnectionTimer: unknown;

  /**
   * Time between reconnection attempts
   */
  private readonly reconnectionTimeout: number;

  /**
   * How many times we should attempt reconnection
   */
  private reconnectionAttempts: number;

  /**
   * Page hide event handler reference (for removal)
   */
  private pageHideHandler: () => void;

  /**
   * Timer that closes an idle connection after no errors have been sent
   * for connectionIdleMs milliseconds.
   */
  private connectionIdleTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * How long (ms) to keep the connection open after the last error was sent.
   * Errors often come in bursts, so holding the socket briefly avoids
   * the overhead of opening a new connection for each one.
   */
  private readonly connectionIdleMs: number;

  /**
   * Deduplicates concurrent openConnection() calls — all callers share the
   * same in-flight Promise so only one WebSocket is ever created at a time.
   */
  private readonly initOnce: () => Promise<void>;

  /**
   * Creates new Socket instance. Setup initial socket params.
   *
   * @param options — constructor options for catcher initialization
   */
  constructor({
    collectorEndpoint,
    // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
    onMessage = (message: MessageEvent): void => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onClose = (): void => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onOpen = (): void => {},
    reconnectionAttempts = 5,
    reconnectionTimeout = 10000, // 10 * 1000 ms = 10 sec
    connectionIdleMs = 10000, // 10 sec — close connection if no new errors arrive
  }) {
    this.url = collectorEndpoint;
    this.onMessage = onMessage;
    this.onClose = onClose;
    this.onOpen = onOpen;
    this.reconnectionTimeout = reconnectionTimeout;
    this.reconnectionAttempts = reconnectionAttempts;
    this.connectionIdleMs = connectionIdleMs;

    this.pageHideHandler = () => {
      this.close();
    };

    this.eventsQueue = [];
    this.ws = null;
    this.initOnce = singleFlight(() => this.openConnection());

    /**
     * Connection is not opened eagerly — it is created on the first send()
     * and closed automatically after connectionIdleMs of inactivity.
     */
  }

  /**
   * Send an event to the Collector
   *
   * @param message - event data in Hawk Format
   */
  public async send(message: CatcherMessage<T>): Promise<void> {
    this.eventsQueue.push(message);

    if (this.ws === null) {
      await this.initOnce();
    }

    if (this.ws === null) {
      return;
    }

    switch (this.ws.readyState) {
      case WebSocket.OPEN:
        return this.sendQueue();

      case WebSocket.CLOSED:
        return this.reconnect();
    }
  }

  /**
   * Setup window event listeners
   */
  private setupListeners(): void {
    window.addEventListener('pagehide', this.pageHideHandler, { capture: true });
  }

  /**
   * Remove window event listeners
   */
  private destroyListeners(): void {
    window.removeEventListener('pagehide', this.pageHideHandler, { capture: true });
  }

  /**
   * Create new WebSocket connection and setup socket event listeners.
   * Always call initOnce() instead — it deduplicates concurrent calls.
   */
  private openConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.detachSocket();
      this.ws = new WebSocket(this.url);

      /**
       * New message handler
       */
      if (typeof this.onMessage === 'function') {
        this.ws.onmessage = this.onMessage;
      }

      /**
       * Connection closing handler
       *
       * @param event - websocket event on closing
       */
      this.ws.onclose = (event: CloseEvent): void => {
        this.destroyListeners();

        /**
         * Code 1000 = Normal Closure (intentional), 1001 = Going Away (page unload/navigation).
         * These are expected and should not be reported as a lost connection.
         * Any other code (e.g. 1006 = Abnormal Closure from idle timeout or infrastructure drop)
         * means the connection was lost unexpectedly — notify and reconnect if there are
         * queued events waiting to be sent.
         */
        const isExpectedClose = [WS_CLOSE_NORMAL, WS_CLOSE_GOING_AWAY].includes(event.code);

        if (!isExpectedClose) {
          /**
           * Cancel the idle timer — it belongs to the now-dead connection.
           * A reconnect will set a fresh timer once the new connection is sending.
           */
          if (this.connectionIdleTimer !== null) {
            clearTimeout(this.connectionIdleTimer);
            this.connectionIdleTimer = null;
          }

          if (typeof this.onClose === 'function') {
            this.onClose(event);
          }

          if (this.eventsQueue.length > 0) {
            void this.reconnect();
          }
        }
      };

      /**
       * Error handler
       *
       * @param event - websocket event on error
       */
      this.ws.onerror = (event: Event): void => {
        reject(event);
      };

      this.ws.onopen = (event: Event): void => {
        this.setupListeners();

        if (typeof this.onOpen === 'function') {
          this.onOpen(event);
        }

        resolve();
      };
    });
  }

  /**
   * Closes socket connection and cancels any pending idle timer
   */
  private close(): void {
    if (this.connectionIdleTimer !== null) {
      clearTimeout(this.connectionIdleTimer);
      this.connectionIdleTimer = null;
    }

    this.detachSocket();
  }

  /**
   * Detach handlers and close the previous socket before opening a new one.
   * Without this, the old connection stays open and its onclose/onerror
   * handlers keep firing, causing duplicate reconnect attempts and log noise.
   */
  private detachSocket(): void {
    if (this.ws === null) {
      return;
    }

    this.ws.onopen = null;
    this.ws.onclose = null;
    this.ws.onerror = null;
    this.ws.onmessage = null;
    this.ws.close();
    this.ws = null;

    /**
     * onclose is nulled above so it won't fire — call destroyListeners() directly
     * to ensure the pagehide listener is always removed on explicit close.
     */
    this.destroyListeners();
  }

  /**
   * Resets the idle close timer.
   * Called after each successful send so the connection stays open
   * for connectionIdleMs after the last error in a burst.
   */
  private resetIdleTimer(): void {
    if (this.connectionIdleTimer !== null) {
      clearTimeout(this.connectionIdleTimer);
    }

    this.connectionIdleTimer = setTimeout(() => {
      this.connectionIdleTimer = null;
      this.close();
    }, this.connectionIdleMs);
  }

  /**
   * Tries to reconnect to the server for specified number of times with the interval
   *
   * @param isForcedCall - call function despite on timer
   */
  private async reconnect(isForcedCall = false): Promise<void> {
    if (this.reconnectionTimer && !isForcedCall) {
      return;
    }

    this.reconnectionTimer = null;

    try {
      await this.initOnce();

      log('Successfully reconnected. Sending queued events...', 'info');

      return this.sendQueue();
    } catch (error) {
      this.reconnectionAttempts--;

      if (this.reconnectionAttempts === 0) {
        return;
      }

      this.reconnectionTimer = setTimeout(() => {
        void this.reconnect(true);
      }, this.reconnectionTimeout);
    }
  }

  /**
   * Sends all queued events directly via the WebSocket.
   * Bypasses send() intentionally — send() always enqueues first,
   * so calling it here would cause infinite recursion.
   */
  private sendQueue(): void {
    if (this.ws === null || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.resetIdleTimer();

    while (this.eventsQueue.length) {
      const event = this.eventsQueue.shift();

      if (!event) {
        continue;
      }

      try {
        this.ws.send(JSON.stringify(event));
      } catch (sendingError) {
        log('WebSocket sending error', 'error', sendingError);
      }
    }
  }
}
