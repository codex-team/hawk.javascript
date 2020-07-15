import { HawkInitialSettings } from '../types/hawk-initial-settings';
import { HawkEventContext } from '../types/hawk-event';
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
    readonly version: string;
    /**
     * Catcher Type
     */
    private readonly type;
    /**
     * User project's Integration Token
     */
    private readonly token;
    /**
     * Current bundle version
     */
    private readonly release;
    /**
     * Current authenticated user
     */
    private readonly user;
    /**
     * Any additional data passed by user for sending with all messages
     */
    private readonly context;
    /**
     * Transport for dialog between Catcher and Collector
     * (WebSocket decorator)
     */
    private readonly transport;
    /**
     * Module for parsing backtrace
     */
    private readonly stackParser;
    /**
     * Catcher constructor
     *
     * @param {HawkInitialSettings|string} settings - If settings is a string, it means an Integration Token
     */
    constructor(settings: HawkInitialSettings | string);
    /**
     * Generates user if no one provided via HawkCatcher settings
     * After generating, stores user for feature requests
     */
    private static getGeneratedUser;
    /**
     * Send test event from client
     */
    test(): void;
    /**
     * Public method for manual sending messages to the Hawk
     * Can be called in user's try-catch blocks or by other custom logic
     *
     * @param message - what to send
     * @param [context] - any additional data to send
     */
    send(message: Error | string, context?: HawkEventContext): void;
    /**
     * Add error handing to the passed Vue app
     *
     * @param vue - Vue app
     */
    connectVue(vue: any): void;
    /**
     * Init global errors handler
     */
    private initGlobalHandlers;
    /**
     * Handles the event and sends it to the server
     *
     * @param {ErrorEvent|PromiseRejectionEvent} event — (!) both for Error and Promise Rejection
     */
    private handleEvent;
    /**
     * Format and send an error
     *
     * @param error - error to send
     * @param integrationAddons - addons spoiled by Integration
     * @param context - any additional data passed by user
     */
    private formatAndSend;
    /**
     * Sends formatted HawkEvent to the Collector
     *
     * @param errorFormatted - formatted error to send
     */
    private sendErrorFormatted;
    /**
     * Formats the event
     *
     * @param error - error to format
     * @param context - any additional data passed by user
     */
    private prepareErrorFormatted;
    /**
     * Return event title
     *
     * @param error - event from which to get the title
     */
    private getTitle;
    /**
     * Return event type: TypeError, ReferenceError etc
     *
     * @param error - catched error
     */
    private getType;
    /**
     * Release version
     */
    private getRelease;
    /**
     * Collects additional information
     *
     * @param context - any additional data passed by user
     */
    private getContext;
    /**
     * Current authenticated user
     */
    private getUser;
    /**
     * Get parameters
     */
    private getGetParams;
    /**
     * Return parsed backtrace information
     *
     * @param error - event from which to get backtrace
     */
    private getBacktrace;
    /**
     * Return some details
     */
    private getAddons;
    /**
     * Extend addons object with addons spoiled by integreation
     * This method mutates original event
     *
     * @param errorFormatted - Hawk event prepared for sending
     * @param integrationAddons - extra addons
     */
    private appendIntegrationAddons;
}
