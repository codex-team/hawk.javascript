/**
 * @file Breadcrumbs module - captures chronological trail of events before an error
 */
import type { Breadcrumb, BreadcrumbLevel, BreadcrumbType, Json } from '@hawk.so/types';
import Sanitizer from '../modules/sanitizer';

/**
 * Default maximum number of breadcrumbs to store
 */
const DEFAULT_MAX_BREADCRUMBS = 15;

/**
 * Maximum length for string values in breadcrumb data
 */
const DEFAULT_MAX_VALUE_LENGTH = 1024;

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
   * Maximum length for string values (will be trimmed)
   *
   * @default 1024
   */
  maxValueLength?: number;

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
   * @default false
   */
  trackClicks?: boolean;
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
   * Configuration options
   */
  private options: Required<Omit<BreadcrumbsOptions, 'beforeBreadcrumb'>> & Pick<BreadcrumbsOptions, 'beforeBreadcrumb'>;

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
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.options = {
      maxBreadcrumbs: DEFAULT_MAX_BREADCRUMBS,
      maxValueLength: DEFAULT_MAX_VALUE_LENGTH,
      trackFetch: true,
      trackNavigation: true,
      trackClicks: false,
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
   * @param options
   */
  public init(options: BreadcrumbsOptions = {}): void {
    if (this.isInitialized) {
      return;
    }

    this.options = {
      maxBreadcrumbs: options.maxBreadcrumbs ?? DEFAULT_MAX_BREADCRUMBS,
      maxValueLength: options.maxValueLength ?? DEFAULT_MAX_VALUE_LENGTH,
      beforeBreadcrumb: options.beforeBreadcrumb,
      trackFetch: options.trackFetch ?? true,
      trackNavigation: options.trackNavigation ?? true,
      trackClicks: options.trackClicks ?? false,
    };

    this.isInitialized = true;

    /**
     * Setup auto-capture handlers
     */
    if (this.options.trackFetch) {
      this.wrapFetch();
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
   * @param breadcrumb
   * @param hint
   */
  public addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'> & { timestamp?: Breadcrumb['timestamp'] }, hint?: BreadcrumbHint): void {
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
     * Sanitize and trim data
     */
    if (bc.data) {
      bc.data = this.sanitizeData(bc.data);
    }

    if (bc.message) {
      bc.message = this.trimString(bc.message, this.options.maxValueLength);
    }

    /**
     * Add to buffer (FIFO)
     */
    if (this.breadcrumbs.length >= this.options.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }

    this.breadcrumbs.push(bc);
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
   * Sanitize and trim breadcrumb data object
   *
   * @param data
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sanitizeData(data: Record<string, any>): Record<string, Json> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sanitized = Sanitizer.sanitize(data) as Record<string, any>;

    // Trim string values
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'string') {
        sanitized[key] = this.trimString(sanitized[key], this.options.maxValueLength);
      }
    }

    return sanitized as Record<string, Json>;
  }

  /**
   * Trim string to max length
   *
   * @param str
   * @param maxLength
   */
  private trimString(str: string, maxLength: number): string {
    if (str.length > maxLength) {
      return str.substring(0, maxLength) + '…';
    }

    return str;
  }

  /**
   * Wrap fetch API to capture HTTP breadcrumbs
   */
  private wrapFetch(): void {
    if (typeof fetch === 'undefined') {
      return;
    }

    const originalFetch = window.fetch.bind(window);
    this.originalFetch = originalFetch;

    const manager = this;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const startTime = Date.now();
      const method = init?.method || 'GET';
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

      let response: Response;

      try {
        response = await originalFetch(input, init);

        const duration = Date.now() - startTime;

        manager.addBreadcrumb({
          type: 'request',
          category: 'fetch',
          message: `${method} ${url} ${response.status}`,
          level: response.ok ? 'info' : 'error',
          data: {
            url,
            method,
            status_code: response.status,
            duration_ms: duration,
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
          message: `${method} ${url} failed`,
          level: 'error',
          data: {
            url,
            method,
            duration_ms: duration,
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

    const manager = this;
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    this.originalXHROpen = originalOpen;
    this.originalXHRSend = originalSend;

    /**
     * Store request info on the XHR instance
     */
    interface XHRWithBreadcrumb extends XMLHttpRequest {
      __hawk_method?: string;
      __hawk_url?: string;
      __hawk_start?: number;
    }

    XMLHttpRequest.prototype.open = function (this: XHRWithBreadcrumb, method: string, url: string | URL, ...args: unknown[]) {
      this.__hawk_method = method;
      this.__hawk_url = typeof url === 'string' ? url : url.href;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return originalOpen.apply(this, [method, url, ...args] as any);
    };

    XMLHttpRequest.prototype.send = function (this: XHRWithBreadcrumb, body?: Document | XMLHttpRequestBodyInit | null) {
      this.__hawk_start = Date.now();

      const onReadyStateChange = (): void => {
        if (this.readyState === XMLHttpRequest.DONE) {
          const duration = Date.now() - (this.__hawk_start || Date.now());
          const method = this.__hawk_method || 'GET';
          const url = this.__hawk_url || '';
          const status = this.status;

          manager.addBreadcrumb({
            type: 'request',
            category: 'xhr',
            message: `${method} ${url} ${status}`,
            level: status >= 200 && status < 400 ? 'info' : 'error',
            data: {
              url,
              method,
              status_code: status,
              duration_ms: duration,
            },
          }, {
            xhr: this,
          });
        }
      };

      /**
       * Add listener without overwriting existing one
       */
      this.addEventListener('readystatechange', onReadyStateChange);

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
    window.addEventListener('popstate', () => {
      createNavigationBreadcrumb(window.location.href);
    });
  }

  /**
   * Setup click event tracking for UI breadcrumbs
   */
  private setupClickTracking(): void {
    const manager = this;

    this.clickHandler = (event: MouseEvent): void => {
      const target = event.target as HTMLElement;

      if (!target) {
        return;
      }

      /**
       * Build a simple selector
       */
      let selector = target.tagName.toLowerCase();

      if (target.id) {
        selector += `#${target.id}`;
      } else if (target.className && typeof target.className === 'string') {
        selector += `.${target.className.split(' ').filter(Boolean)
          .join('.')}`;
      }

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
          text: text || undefined,
          tagName: target.tagName,
        },
      }, {
        event,
      });
    };

    document.addEventListener('click', this.clickHandler, { capture: true });
  }

  /**
   * Destroy the manager and restore original functions
   */
  public destroy(): void {
    /**
     * Restore fetch
     */
    if (this.originalFetch) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).fetch = this.originalFetch;
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

    this.clearBreadcrumbs();
    this.isInitialized = false;
    BreadcrumbManager.instance = null;
  }
}

/**
 * Helper function to create a breadcrumb object
 *
 * @param message
 * @param options
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

