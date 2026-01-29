/**
 * @file Breadcrumbs module - captures chronological trail of events before an error
 */
import type { Breadcrumb, BreadcrumbLevel, BreadcrumbType, Json, JsonNode } from '@hawk.so/types';
import Sanitizer from '../modules/sanitizer';
import { buildElementSelector } from '../utils/selector';
import log from '../utils/log';

/**
 * Default maximum number of breadcrumbs to store
 */
const DEFAULT_MAX_BREADCRUMBS = 15;

/**
 * Hint object passed to beforeBreadcrumb callback
 */
export interface BreadcrumbHint {
  /**
   * Original event that triggered the breadcrumb (if any)
   */
  event?: Event | Response | XMLHttpRequest;

  /**
   * Request info for fetch/xhr breadcrumbs
   */
  input?: RequestInfo | URL;

  /**
   * Response data for fetch/xhr breadcrumbs
   */
  response?: Response;

  /**
   * XHR instance for xhr breadcrumbs
   */
  xhr?: XMLHttpRequest;
}

/**
 * Configuration options for breadcrumbs
 */
export interface BreadcrumbsOptions {
  /**
   * Maximum number of breadcrumbs to store (FIFO)
   *
   * @default 15
   */
  maxBreadcrumbs?: number;

  /**
   * Hook called before each breadcrumb is stored
   * Return null to discard the breadcrumb
   * Return modified breadcrumb to store it
   */
  beforeBreadcrumb?: (breadcrumb: Breadcrumb, hint?: BreadcrumbHint) => Breadcrumb | null;

  /**
   * Enable automatic fetch/XHR breadcrumbs
   *
   * @default true
   */
  trackFetch?: boolean;

  /**
   * Enable automatic navigation breadcrumbs (history API)
   *
   * @default true
   */
  trackNavigation?: boolean;

  /**
   * Enable automatic UI click breadcrumbs
   *
   * @default true
   */
  trackClicks?: boolean;
}

/**
 * Breadcrumb input type - breadcrumb data with optional timestamp
 * (timestamp will be auto-generated if not provided)
 */
export type BreadcrumbInput = Omit<Breadcrumb, 'timestamp'> & { timestamp?: Breadcrumb['timestamp'] };

/**
 * Internal breadcrumbs options - all fields except 'beforeBreadcrumb' are required
 * (they have default values and are always set during init)
 */
interface InternalBreadcrumbsOptions {
  maxBreadcrumbs: number;
  trackFetch: boolean;
  trackNavigation: boolean;
  trackClicks: boolean;
  beforeBreadcrumb?: (breadcrumb: Breadcrumb, hint?: BreadcrumbHint) => Breadcrumb | null;
}

/**
 * BreadcrumbManager - singleton that manages breadcrumb collection and storage
 */
export class BreadcrumbManager {
  /**
   * Singleton instance
   */
  private static instance: BreadcrumbManager | null = null;

  /**
   * Breadcrumbs buffer (FIFO)
   */
  private readonly breadcrumbs: Breadcrumb[] = [];

  /**
   * Configuration options - all fields are guaranteed to be set (except optional beforeBreadcrumb)
   */
  private options: InternalBreadcrumbsOptions;

  /**
   * Initialization flag
   */
  private isInitialized = false;

  /**
   * Original fetch function (for restoration)
   */
  private originalFetch: typeof fetch | null = null;

  /**
   * Original XMLHttpRequest.open (for restoration)
   */
  private originalXHROpen: typeof XMLHttpRequest.prototype.open | null = null;

  /**
   * Original XMLHttpRequest.send (for restoration)
   */
  private originalXHRSend: typeof XMLHttpRequest.prototype.send | null = null;

  /**
   * Original history.pushState (for restoration)
   */
  private originalPushState: typeof history.pushState | null = null;

  /**
   * Original history.replaceState (for restoration)
   */
  private originalReplaceState: typeof history.replaceState | null = null;

  /**
   * Click event handler reference (for removal)
   */
  private clickHandler: ((event: MouseEvent) => void) | null = null;

  /**
   * Popstate event handler reference (for removal)
   */
  private popstateHandler: (() => void) | null = null;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.options = {
      maxBreadcrumbs: DEFAULT_MAX_BREADCRUMBS,
      trackFetch: true,
      trackNavigation: true,
      trackClicks: true,
    };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): BreadcrumbManager {
    BreadcrumbManager.instance ??= new BreadcrumbManager();

    return BreadcrumbManager.instance;
  }

  /**
   * Initialize breadcrumbs with options and start auto-capture
   *
   * @param options - Configuration options for breadcrumbs
   */
  public init(options: BreadcrumbsOptions = {}): void {
    if (this.isInitialized) {
      log('[BreadcrumbManager] init has already been called; breadcrumb configuration is global and subsequent init options are ignored.', 'warn');

      return;
    }

    this.options = {
      maxBreadcrumbs: options.maxBreadcrumbs ?? DEFAULT_MAX_BREADCRUMBS,
      beforeBreadcrumb: options.beforeBreadcrumb,
      trackFetch: options.trackFetch ?? true,
      trackNavigation: options.trackNavigation ?? true,
      trackClicks: options.trackClicks ?? true,
    };

    this.isInitialized = true;

    /**
     * Setup auto-capture handlers
     */
    if (this.options.trackFetch) {
      this.monkeypatchFetch();
      this.wrapXHR();
    }

    if (this.options.trackNavigation) {
      this.wrapHistory();
    }

    if (this.options.trackClicks) {
      this.setupClickTracking();
    }
  }

  /**
   * Add a breadcrumb to the buffer
   *
   * @param breadcrumb - The breadcrumb data to add
   * @param hint - Optional hint object with original event data (Event, Response, XMLHttpRequest, etc.)
   *               Used by beforeBreadcrumb callback to access original event context
   */
  public addBreadcrumb(breadcrumb: BreadcrumbInput, hint?: BreadcrumbHint): void {
    /**
     * Ensure timestamp
     */
    const bc: Breadcrumb = {
      ...breadcrumb,
      timestamp: breadcrumb.timestamp ?? Date.now(),
    };

    /**
     * Apply beforeBreadcrumb hook
     */
    if (this.options.beforeBreadcrumb) {
      const result = this.options.beforeBreadcrumb(bc, hint);

      if (result === null) {
        /**
         * Discard breadcrumb
         */
        return;
      }

      Object.assign(bc, result);
    }

    /**
     * Sanitize data and message
     */
    if (bc.data) {
      bc.data = Sanitizer.sanitize(bc.data) as Record<string, JsonNode>;
    }

    if (bc.message) {
      bc.message = Sanitizer.sanitize(bc.message) as string;
    }

    /**
     * Add to buffer (FIFO)
     */
    this.breadcrumbs.push(bc);

    if (this.breadcrumbs.length > this.options.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  /**
   * Get current breadcrumbs snapshot (oldest to newest)
   */
  public getBreadcrumbs(): Breadcrumb[] {
    return [ ...this.breadcrumbs ];
  }

  /**
   * Clear all breadcrumbs
   */
  public clearBreadcrumbs(): void {
    this.breadcrumbs.length = 0;
  }

  /**
   * Destroy the manager and restore original functions
   */
  public destroy(): void {
    /**
     * Restore fetch
     */
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
      this.originalFetch = null;
    }

    /**
     * Restore XHR
     */
    if (this.originalXHROpen) {
      XMLHttpRequest.prototype.open = this.originalXHROpen;
      this.originalXHROpen = null;
    }

    if (this.originalXHRSend) {
      XMLHttpRequest.prototype.send = this.originalXHRSend;
      this.originalXHRSend = null;
    }

    /**
     * Restore history
     */
    if (this.originalPushState) {
      history.pushState = this.originalPushState;
      this.originalPushState = null;
    }

    if (this.originalReplaceState) {
      history.replaceState = this.originalReplaceState;
      this.originalReplaceState = null;
    }

    /**
     * Remove click handler
     */
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler, { capture: true });
      this.clickHandler = null;
    }

    /**
     * Remove popstate handler
     */
    if (this.popstateHandler) {
      window.removeEventListener('popstate', this.popstateHandler);
      this.popstateHandler = null;
    }

    this.clearBreadcrumbs();
    this.isInitialized = false;
    BreadcrumbManager.instance = null;
  }


  /**
   * Monkeypatch fetch API to capture HTTP breadcrumbs
   */
  private monkeypatchFetch(): void {
    if (typeof fetch === 'undefined') {
      return;
    }

    const originalFetch = window.fetch.bind(window);

    this.originalFetch = originalFetch;

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const manager = this;

    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const startTime = Date.now();
      const method = init?.method || 'GET';
      let url: string;

      if (typeof input === 'string') {
        url = input;
      } else if (input instanceof URL) {
        url = input.href;
      } else {
        url = input.url;
      }

      let response: Response;

      try {
        response = await originalFetch(input, init);

        const duration = Date.now() - startTime;

        manager.addBreadcrumb({
          type: 'request',
          category: 'fetch',
          message: `${response.status} ${method} ${url}`,
          level: response.ok ? 'info' : 'error',
          data: {
            url,
            method,
            statusCode: response.status,
            durationMs: duration,
          },
        }, {
          input,
          response,
        });

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;

        manager.addBreadcrumb({
          type: 'request',
          category: 'fetch',
          message: `[FAIL] ${method} ${url}`,
          level: 'error',
          data: {
            url,
            method,
            statusCode: 0,
            durationMs: duration,
            error: error instanceof Error ? error.message : String(error),
          },
        }, {
          input,
        });

        throw error;
      }
    };
  }

  /**
   * Wrap XMLHttpRequest to capture XHR breadcrumbs
   */
  private wrapXHR(): void {
    if (typeof XMLHttpRequest === 'undefined') {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const manager = this;
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    this.originalXHROpen = originalOpen;
    this.originalXHRSend = originalSend;

    /**
     * Store request info on the XHR instance
     */
    interface XHRWithBreadcrumb extends XMLHttpRequest {
      hawkMethod?: string;
      hawkUrl?: string;
      hawkStart?: number;
      hawkListenerAdded?: boolean;
    }

    XMLHttpRequest.prototype.open = function (this: XHRWithBreadcrumb, method: string, url: string | URL, ...args: unknown[]) {
      this.hawkMethod = method;
      this.hawkUrl = typeof url === 'string' ? url : url.href;

      return originalOpen.apply(this, [method, url, ...args] as Parameters<typeof originalOpen>);
    };

    XMLHttpRequest.prototype.send = function (this: XHRWithBreadcrumb, body?: Document | XMLHttpRequestBodyInit | null) {
      this.hawkStart = Date.now();

      const onReadyStateChange = (): void => {
        if (this.readyState === XMLHttpRequest.DONE) {
          const duration = Date.now() - (this.hawkStart || Date.now());
          const method = this.hawkMethod || 'GET';
          const url = this.hawkUrl || '';
          const status = this.status;

          manager.addBreadcrumb({
            type: 'request',
            category: 'xhr',
            message: `${status} ${method} ${url}`,
            level: status >= 200 && status < 400 ? 'info' : 'error',
            data: {
              url,
              method,
              statusCode: status,
              durationMs: duration,
            },
          }, {
            xhr: this,
          });
        }
      };

      /**
       * Add listener only once per XHR instance to prevent duplicates
       */
      if (!this.hawkListenerAdded) {
        this.addEventListener('readystatechange', onReadyStateChange);
        this.hawkListenerAdded = true;
      }

      return originalSend.call(this, body);
    };
  }

  /**
   * Wrap History API to capture navigation breadcrumbs
   */
  private wrapHistory(): void {
    if (typeof history === 'undefined') {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const manager = this;
    let lastUrl = window.location.href;

    const createNavigationBreadcrumb = (to: string): void => {
      const from = lastUrl;

      lastUrl = to;

      manager.addBreadcrumb({
        type: 'navigation',
        category: 'navigation',
        message: `Navigated to ${to}`,
        level: 'info',
        data: {
          from,
          to,
        },
      });
    };

    /**
     * Wrap pushState
     */
    this.originalPushState = history.pushState;
    history.pushState = function (...args) {
      const result = manager.originalPushState!.apply(this, args);

      createNavigationBreadcrumb(window.location.href);

      return result;
    };

    /**
     * Wrap replaceState
     */
    this.originalReplaceState = history.replaceState;
    history.replaceState = function (...args) {
      const result = manager.originalReplaceState!.apply(this, args);

      createNavigationBreadcrumb(window.location.href);

      return result;
    };

    /**
     * Listen for popstate (back/forward)
     */
    this.popstateHandler = (): void => {
      createNavigationBreadcrumb(window.location.href);
    };

    window.addEventListener('popstate', this.popstateHandler);
  }

  /**
   * Setup click event tracking for UI breadcrumbs
   */
  private setupClickTracking(): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const manager = this;

    this.clickHandler = (event: MouseEvent): void => {
      const target = event.target as HTMLElement;

      if (!target) {
        return;
      }

      /**
       * Build a simple selector
       */
      const selector = buildElementSelector(target);

      /**
       * Get text content (limited)
       */
      const text = (target.textContent || target.innerText || '').trim().substring(0, 50);

      manager.addBreadcrumb({
        type: 'ui',
        category: 'ui.click',
        message: `Click on ${selector}`,
        level: 'info',
        data: {
          selector,
          text,
          tagName: target.tagName,
        },
      }, {
        event,
      });
    };

    document.addEventListener('click', this.clickHandler, {
      capture: true,
      passive: true });
  }
}

/**
 * Helper function to create a breadcrumb object
 *
 * @param message - The breadcrumb message
 * @param options - Optional breadcrumb configuration
 */
export function createBreadcrumb(
  message: string,
  options?: {
    type?: BreadcrumbType;
    category?: string;
    level?: BreadcrumbLevel;
    data?: Record<string, Json>;
  }
): Breadcrumb {
  return {
    timestamp: Date.now(),
    message,
    type: options?.type ?? 'default',
    category: options?.category,
    level: options?.level ?? 'info',
    data: options?.data,
  };
}
