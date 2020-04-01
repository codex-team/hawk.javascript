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
     * Send test event from client
     */
    test(): void;
    /**
     * This method prepares and sends an Error to Hawk
     * User can fire it manually on try-catch
     */
    catchError(error: Error): Promise<void>;
    /**
     * Add error handing to the passed Vue app
     * @param vue - Vue app
     */
    connectVue(vue: any): void;
    /**
     * Init global errors handler
     */
    private initGlobalHandlers;
    /**
     * Handles the event and sends it to the server
     * @param {ErrorEvent|PromiseRejectionEvent} event — (!) both for Error and Promise Rejection
     */
    private handleEvent;
    /**
     * Format and send an error
     * @param error - error to send
     * @param {object} integrationAddons - addons spoiled by Integration
     */
    private formatAndSend;
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
     * Return event type: TypeError, ReferenceError etc
     * @param error - catched error
     */
    private getType;
    /**
     * Release version
     */
    private getRelease;
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
    /**
     * Extend addons object with addons spoiled by integreation
     * This method mutates original event
     * @param errorFormatted - Hawk event prepared for sending
     * @param integrationAddons - extra addons
     */
    private appendIntegrationAddons;
    /**
     * Sanitize and beautify data
     * - trim long strings
     * - represent html elements like <div ...> as "<div>" instead of "{}"
     * - represent big objects as "<big object>"
     * - represent class as <class SomeClass> or <instance of SomeClass>
     * @param data - object to sanitize
     */
    private sanitize;
}
