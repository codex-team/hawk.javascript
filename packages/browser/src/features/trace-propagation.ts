import { HAWK_TRACE_HEADER, type HawkTraceManager } from '@hawk.so/core';
import type { TracePropagationOptions } from '../types/trace';

/**
 * Resolves URL string from fetch input.
 *
 * @param input - fetch input
 */
function resolveFetchUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.href;
  }

  return input.url;
}

/**
 * Checks whether propagation target entry is valid.
 *
 * @param target - string prefix or regular expression
 */
function isValidPropagationTarget(target: unknown): target is string | RegExp {
  if (target instanceof RegExp) {
    return true;
  }

  return typeof target === 'string' && target.trim().length > 0;
}

/**
 * Checks whether URL matches configured propagation target.
 *
 * @param resolvedUrl - absolute request URL
 * @param target - string prefix or regular expression
 */
function matchesPropagationTarget(resolvedUrl: string, target: string | RegExp): boolean {
  let pathname = resolvedUrl;

  try {
    pathname = new URL(resolvedUrl).pathname;
  } catch {
    // keep resolvedUrl fallback
  }

  if (target instanceof RegExp) {
    return target.test(resolvedUrl) || target.test(pathname);
  }

  return resolvedUrl.startsWith(target) || pathname.startsWith(target);
}

/**
 * Returns normalized propagation targets or null when feature must stay disabled.
 *
 * @param options - trace propagation options
 */
export function resolvePropagationTargets(
  options?: TracePropagationOptions
): (string | RegExp)[] | null {
  const targets = options?.propagationTargets;

  if (!Array.isArray(targets)) {
    return null;
  }

  const validTargets = targets.filter(isValidPropagationTarget);

  return validTargets.length > 0 ? validTargets : null;
}

/**
 * Builds matcher for allowed trace propagation targets.
 *
 * @param options - trace propagation options
 */
export function resolveTracePropagationMatcher(
  options?: TracePropagationOptions
): ((url: string) => boolean) | null {
  const targets = resolvePropagationTargets(options);

  if (!targets) {
    return null;
  }

  return (url: string) => {
    try {
      const resolvedUrl = new URL(url, window.location.href).href;

      return targets.some((target) => matchesPropagationTarget(resolvedUrl, target));
    } catch {
      return false;
    }
  };
}

/**
 * Adds trace header to fetch init headers.
 *
 * @param headers - original headers
 * @param traceId - current trace id
 */
function appendTraceHeader(headers: HeadersInit | undefined, traceId: string): HeadersInit {
  if (headers instanceof Headers) {
    headers.set(HAWK_TRACE_HEADER, traceId);

    return headers;
  }

  if (Array.isArray(headers)) {
    return [...headers, [HAWK_TRACE_HEADER, traceId]];
  }

  return {
    ...(headers ?? {}),
    [HAWK_TRACE_HEADER]: traceId,
  };
}

/**
 * Adopts trace id from incoming HTTP header when present.
 *
 * @param traceManager - SDK-managed trace state
 * @param traceId - header value
 */
function adoptIncomingTraceId(traceManager: HawkTraceManager, traceId: string | null): void {
  if (traceId) {
    traceManager.adoptTraceId(traceId);
  }
}

/**
 * Patches fetch/XHR to propagate current trace id via HTTP header.
 */
export class TracePropagation {
  /**
   * Whether browser APIs were patched.
   */
  private isInitialized = false;

  /**
   * Matcher that decides whether trace header should be attached.
   */
  private readonly shouldPropagate: ((url: string) => boolean) | null;

  /**
   * @param traceManager - SDK-managed trace state
   * @param options - propagation target configuration
   */
  constructor(private readonly traceManager: HawkTraceManager, options?: TracePropagationOptions) {
    this.shouldPropagate = resolveTracePropagationMatcher(options);
  }

  /**
   * Starts HTTP trace propagation when valid propagation targets are configured.
   */
  public init(): void {
    if (this.isInitialized || typeof window === 'undefined' || !this.shouldPropagate) {
      return;
    }

    this.patchFetch();
    this.patchXHR();
    this.isInitialized = true;
  }

  /**
   * Monkeypatch fetch to inject trace header for allowed URLs.
   */
  private patchFetch(): void {
    if (typeof fetch === 'undefined' || !this.shouldPropagate) {
      return;
    }

    const originalFetch = window.fetch.bind(window);
    const traceManager = this.traceManager;
    const shouldPropagate = this.shouldPropagate;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = resolveFetchUrl(input);

      if (!shouldPropagate(url)) {
        return originalFetch(input, init);
      }

      const traceId = traceManager.getTraceId();

      if (input instanceof Request) {
        const headers = new Headers(input.headers);

        headers.set(HAWK_TRACE_HEADER, traceId);

        const request = new Request(input, { headers });

        const response = await originalFetch(request, init);

        adoptIncomingTraceId(traceManager, response.headers.get(HAWK_TRACE_HEADER));

        return response;
      }

      const response = await originalFetch(input, {
        ...init,
        headers: appendTraceHeader(init?.headers, traceId),
      });

      adoptIncomingTraceId(traceManager, response.headers.get(HAWK_TRACE_HEADER));

      return response;
    };
  }

  /**
   * Monkeypatch XMLHttpRequest to inject trace header for allowed URLs.
   */
  private patchXHR(): void {
    if (typeof XMLHttpRequest === 'undefined' || !this.shouldPropagate) {
      return;
    }

    const traceManager = this.traceManager;
    const shouldPropagate = this.shouldPropagate;
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    interface XHRWithTrace extends XMLHttpRequest {
      _hawkTraceUrl?: string;
    }

    XMLHttpRequest.prototype.open = function (
      this: XHRWithTrace,
      method: string,
      url: string | URL,
      ...rest: unknown[]
    ): void {
      this._hawkTraceUrl = typeof url === 'string' ? url : url.toString();

      return originalOpen.call(this, method, url, ...(rest as [boolean?, string?, string?]));
    };

    XMLHttpRequest.prototype.send = function (
      this: XHRWithTrace,
      body?: Document | XMLHttpRequestBodyInit | null
    ): void {
      const url = this._hawkTraceUrl;

      if (url && shouldPropagate(url)) {
        this.setRequestHeader(HAWK_TRACE_HEADER, traceManager.getTraceId());

        const xhr = this;
        const adoptFromResponse = (): void => {
          if (xhr.readyState !== XMLHttpRequest.DONE) {
            return;
          }

          adoptIncomingTraceId(traceManager, xhr.getResponseHeader(HAWK_TRACE_HEADER));
          xhr.removeEventListener('readystatechange', adoptFromResponse);
        };

        this.addEventListener('readystatechange', adoptFromResponse);
      }

      return originalSend.call(this, body);
    };
  }
}
