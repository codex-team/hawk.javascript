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
    private readonly url;
    /**
     * External handler for socket message
     */
    private readonly onMessage;
    /**
     * External handler for socket opening
     */
    private readonly onOpen;
    /**
     * External handler for socket close
     */
    private readonly onClose;
    /**
     * Queue of events collected while socket is not connected
     * They will be sent when connection will be established
     */
    private eventsQueue;
    /**
     * Websocket instance
     */
    private ws;
    /**
     * Reconnection tryings Timeout
     */
    private reconnectionTimer;
    /**
     * Time between reconnection attempts
     */
    private readonly reconnectionTimeout;
    /**
     * How many time we should attempt reconnection
     */
    private reconnectionAttempts;
    /**
     * Creates new Socket instance. Setup initial socket params.
     */
    constructor({ collectorEndpoint, onMessage, onClose, onOpen, reconnectionAttempts, reconnectionTimeout, }: {
        collectorEndpoint: any;
        onMessage?: (message: MessageEvent) => void;
        onClose?: () => void;
        onOpen?: () => void;
        reconnectionAttempts?: number;
        reconnectionTimeout?: number;
    });
    /**
     * Send an event to the Collector
     *
     * @param {HawkEvent} event - event data in Hawk Format
     */
    send(event: HawkEvent): Promise<void>;
    /**
     * Create new WebSocket connection and setup event listeners
     */
    private init;
    /**
     * Tries to reconnect to the server for specified number of times with the interval
     *
     * @param {boolean} [isForcedCall] - call function despite on timer
     * @return {Promise<void>}
     */
    private reconnect;
    /**
     * Sends all queued events one-by-one
     */
    private sendQueue;
}
