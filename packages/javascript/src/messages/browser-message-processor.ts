import type { MessageProcessor } from '@hawk.so/core';
import type { CatcherMessagePayload } from '@hawk.so/types';
import { type Json } from '@hawk.so/types';

/**
 * Enriches payload with browser environment data:
 * viewport dimensions, user agent, current URL, and GET parameters.
 */
export class BrowserMessageProcessor implements MessageProcessor<'errors/javascript'> {
  /**
   * Reads current browser state (window dimensions, user agent, URL, GET params) and
   * merges it into `payload.addons`, preserving any addons already set.
   *
   * @param payload - event message payload to enrich
   * @returns modified payload with browser addons merged in
   */
  public apply(
    payload: CatcherMessagePayload<'errors/javascript'>
  ): CatcherMessagePayload<'errors/javascript'> | null {
    const { innerWidth, innerHeight } = window;
    const userAgent = window.navigator.userAgent;
    const url = window.location.href;
    const get = this.parseGetParams();

    payload.addons = {
      ...(payload.addons ?? {}),
      window: {
        innerWidth,
        innerHeight,
      },
      userAgent,
      url,
      get,
    };

    return payload;
  }

  /**
   * Parses `window.location.search` into plain key-value object.
   *
   * @returns parsed GET parameters, or `undefined` if URL has no query string
   */
  private parseGetParams(): Json | undefined {
    const searchString = window.location.search.substring(1);

    if (!searchString) {
      return undefined;
    }

    // Create object from get-params string
    const pairs = searchString.split('&');

    return pairs.reduce((accumulator, pair) => {
      const [key, value] = pair.split('=');

      accumulator[key] = value;

      return accumulator;
    }, {});
  }
}
