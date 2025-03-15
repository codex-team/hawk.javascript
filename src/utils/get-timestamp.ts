import { isBrowser } from './is-browser';

/**
 * Get high-resolution timestamp in milliseconds
 */
export const getTimestamp = (): number => {
  if (isBrowser) {
    return performance.now();
  }

  /**
   * process.hrtime.bigint() returns nanoseconds
   * Convert to milliseconds for consistency with browser
   */
  return Number(process.hrtime.bigint() / BigInt(1_000_000));
}; 
