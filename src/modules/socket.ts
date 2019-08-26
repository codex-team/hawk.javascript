import log from './logger';
import { HawkEvent } from '../../types/hawk-event';

/**
 * Custom WebSocket wrapper class
 *
 * @copyright CodeX
 */
export default class Socket {
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
   * Queue of events collected while socket is not connected
   * They will be sent when connection will be established
   */
  private eventsQueue: HawkEvent[];

  /**
   * Websocket instance
   */
  private ws: WebSocket;

  /**
   * Reconnection tryings Timeout
   */
  private reconnectionTimer: unknown;

  /**
   * Time between reconnection attempts
   */
  private readonly reconnectionTimeout: number;

  /**
   * How many time we should attempt reconnection
   */
  private reconnectionAttempts: number;

  /**
   * Creates new Socket instance. Setup initial socket params.
   */
  constructor({
    collectorEndpoint,
    onMessage = (message: MessageEvent) => {},
    onClose = () => {},
    onOpen = () => {},
    reconnectionAttempts = 5,
    reconnectionTimeout = 10 * 1000, // 10 sec
  }) {
    this.url = collectorEndpoint;
    this.onMessage = onMessage;
    this.onClose = onClose;
    this.onOpen = onOpen;
    this.reconnectionTimeout = reconnectionTimeout;
    this.reconnectionAttempts = reconnectionAttempts;

    this.eventsQueue = [];
    this.ws = null;

    this.init()
        .then(() => {
          /**
           * Send queued events if exists
           */
          this.sendQueue();
        })
        .catch((error) => {
          log('WebSocket error', 'error', error);
        });
  }

  /**
   * Send an event to the Collector
   *
   * @param {HawkEvent} event - event data in Hawk Format
   */
  public async send(event: HawkEvent): Promise<void> {
    if (this.ws === null) {
      this.eventsQueue.push(event);
      return this.init();
    }

    switch (this.ws.readyState) {
      case WebSocket.OPEN:
        return this.ws.send(JSON.stringify(event));
      case WebSocket.CLOSED:
        this.eventsQueue.push(event);
        return this.reconnect();
      case WebSocket.CONNECTING:
      case WebSocket.CLOSING:
        this.eventsQueue.push(event);
        return;
    }
  }

  /**
   * Create new WebSocket connection and setup event listeners
   */
  private init(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      /**
       * New message handler
       */
      if (typeof this.onMessage === 'function') {
        this.ws.onmessage = this.onMessage;
      }

      /**
       * Connection closing handler
       */
      this.ws.onclose = (event: CloseEvent) => {
        if (typeof this.onClose === 'function') {
          this.onClose(event);
        }
      };

      /**
       * Error handler
       */
      this.ws.onerror = (event: Event) => {
        reject(event);
      };

      this.ws.onopen = (event: Event) => {
        if (typeof this.onOpen === 'function') {
          this.onOpen(event);
        }

        resolve();
      };
    });
  }

  /**
   * Tries to reconnect to the server a specified number of times with the interval
   *
   * @param {boolean} [isForcedCall] - call function despite on timer
   * @return {Promise<void>}
   */
  private async reconnect(isForcedCall: boolean = false): Promise<void> {
    if (this.reconnectionTimer && !isForcedCall) {
      return;
    }

    this.reconnectionTimer = null;

    try {
      await this.init();

      log('Successfully reconnected.', 'info');
    } catch (error) {
      this.reconnectionAttempts--;

      if (this.reconnectionAttempts === 0) {
        return;
      }

      this.reconnectionTimer = setTimeout(() => {
        this.reconnect(true);
      }, this.reconnectionTimeout);
    }
  }

  /**
   * Sends all queued events one-by-one
   */
  private sendQueue(): void {
    while (this.eventsQueue.length) {
      this.send(this.eventsQueue.shift())
        .catch(((sendingError) => {
          log('WebSocket sending error', 'error', sendingError);
        }));
    }
  }
}
