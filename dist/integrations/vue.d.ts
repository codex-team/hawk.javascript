/**
 * Errors fired inside Vue components are not dispatched by global handlers.
 * This integration allow us to set up own error handler
 */
export declare class VueIntegration {
    /**
     * Vue application to handle errors in it
     */
    private readonly vue;
    /**
     * User can set up own vue error handler,
     * we should save and call it at the end
     */
    private readonly existedHandler;
    /**
     * Callback that should be triggered with catched error.
     * This callback is used by parent class to format and send an event.
     */
    private callback;
    /**
     * Set up a new vue app
     * @param vue - Vue app to handle
     * @param callback - callback that accepts new error
     */
    constructor(vue: any, callback: any);
    private setupHandler;
    /**
     * Extract additional useful information from the Vue app
     * @param vm - vue VM
     * @param info - a Vue-specific error info, e.g. which lifecycle hook the error was found in.
     */
    private spoilAddons;
    /**
     * Write error to the console
     * @param err - error to print
     * @param info - a Vue-specific error info, e.g. which lifecycle hook the error was found in.
     * @param component - where error was occurred
     */
    private printError;
}
/**
 * Additional data spoiled from Vue app
 */
export interface VueIntegrationAddons {
    /**
     * A Vue-specific error info, e.g. which lifecycle hook the error was found in.
     */
    lifecycle: string;
    /**
     * Component name where error occurred
     */
    component: string;
    /**
     * Component props
     */
    props?: {
        [key: string]: any;
    };
    /**
     * Component local variables
     */
    data?: {
        [key: string]: any;
    };
}
