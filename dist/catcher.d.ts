import { HawkInitialSettings } from '../types/hawk-initial-settings';
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
     * @param {HawkInitialSettings|string} settings - If settings is a string, it means an Integration Token
     */
    constructor(settings: HawkInitialSettings | string);
    /**
     * Init global errors handler
     */
    initGlobalHandlers(): void;
    /**
     * Send test event from client
     */
    test(): void;
    /**
     * This method prepares and sends an Error to Hawk
     * User can fire it manually on try-catch
     */
    catchError(error: Error): Promise<void>;
    /**
     * Handles the event and sends it to the server
     * @param {ErrorEvent|PromiseRejectionEvent} event — (!) both for Error and Promise Rejection
     */
    private handleEvent;
    /**
     * Sends formatted HawkEvent to the Collector
     */
    private sendErrorFormatted;
    /**
     * Formats the event
     */
    private prepareErrorFormatted;
    /**
     * Return event title
     */
    private getTitle;
    /**
     * Return event label: TypeError, ReferenceError etc
     * @param error - catched error
     */
    private getLabel;
    /**
     * Release version
     */
    private getRelease;
    /**
     * Current timestamp
     */
    private getTime;
    /**
     * Collects additional information
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
     */
    private getBacktrace;
    /**
     * Return some details
     */
    private getAddons;
}
