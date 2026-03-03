import type { CatcherMessagePayload } from '@hawk.so/types';
import type { HawkCatcherPlugin } from '@hawk.so/core';
import type { JavaScriptAddons } from '@hawk.so/types';
import type { Json } from '@hawk.so/types';
import { ConsoleCatcher } from '../addons/console-catcher';

/**
 * Plugin that collects browser-specific addons (window size, userAgent, URL, GET params,
 * console logs) and attaches them to outgoing event.
 */
export class BrowserAddonsPlugin implements HawkCatcherPlugin<'errors/javascript'> {

  public readonly name = 'browser-addons';

  /**
   * Whether to include console logs in the addons
   */
  private readonly consoleTracking: boolean;

  /**
   * Whether to include raw event data in the addons (debug mode)
   */
  private readonly debug: boolean;

  /**
   * Console catcher instance (initialized in setup)
   */
  private consoleCatcher: ConsoleCatcher | null = null;

  constructor(options: { consoleTracking?: boolean; debug?: boolean } = {}) {
    this.consoleTracking = options.consoleTracking ?? true;
    this.debug = options.debug ?? false;
  }

  /**
   * Initialize the console catcher if console tracking is enabled
   */
  public setup(): void {
    if (this.consoleTracking) {
      this.consoleCatcher = ConsoleCatcher.getInstance();
      this.consoleCatcher.init();
    }
  }

  /**
   * Attach browser addons to the event payload
   */
  public processEvent(
    event: CatcherMessagePayload<'errors/javascript'>,
    hint: Record<string, unknown>
  ): CatcherMessagePayload<'errors/javascript'> {
    const { innerWidth, innerHeight } = window;
    const userAgent = window.navigator.userAgent;
    const location = window.location.href;
    const getParams = this.getGetParams();
    const consoleLogs = this.consoleTracking && this.consoleCatcher?.getConsoleLogStack();

    const addons: JavaScriptAddons = {
      ...(event.addons as JavaScriptAddons | undefined),
      window: { innerWidth, innerHeight },
      userAgent,
      url: location,
    };

    if (getParams) {
      addons.get = getParams;
    }

    if (this.debug) {
      const error = hint['__error__'];

      if (error instanceof Error || typeof error === 'string') {
        addons.RAW_EVENT_DATA = this.getRawData(error);
      }
    }

    if (consoleLogs && consoleLogs.length > 0) {
      addons.consoleOutput = consoleLogs;
    }

    return { ...event, addons };
  }

  /**
   * Parse URL GET parameters into a key-value object
   */
  private getGetParams(): Json | null {
    const searchString = window.location.search.substring(1);

    if (!searchString) {
      return null;
    }

    const pairs = searchString.split('&');

    return pairs.reduce<Record<string, string>>((acc, pair) => {
      const [key, value] = pair.split('=');

      acc[key] = value;

      return acc;
    }, {});
  }

  /**
   * Build a raw data object from an Error for debug purposes
   */
  private getRawData(error: Error | string): Json | undefined {
    if (!(error instanceof Error)) {
      return undefined;
    }

    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? '',
    };
  }
}
