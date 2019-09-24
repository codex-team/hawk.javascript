/**
 * Sends AJAX request and wait for some time.
 * If time is exceeded, cancel the request.
 * @param {string} url — request endpoint
 * @param {number} ms — maximum request time allowed
 */
export default function fetchTimer(url: string, ms: number): Promise<any>;
