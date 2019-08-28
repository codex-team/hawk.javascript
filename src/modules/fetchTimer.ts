/**
 * Sends AJAX request and wait for some time.
 * If time is exceeded, cancel the request.
 * @param {string} url — request endpoint
 * @param {number} ms — maximum request time allowed
 */
import log from './logger';

export default function fetchTimer(url: string, ms: number): Promise<any> {
  /**
   * Using AbortController to cancel fetch request
   * @see https://developer.mozilla.org/en-US/docs/Web/API/AbortController
   */
  const controller = new AbortController();
  const signal = controller.signal;
  const fetchPromise = fetch(url, {
    signal,
  });

  const timeoutId = setTimeout(() => {
    controller.abort();
    log('Request is too long, aborting...', 'log', url);
  }, ms);

  return fetchPromise.then((response) => {
    clearTimeout(timeoutId);

    return response;
  });
}
