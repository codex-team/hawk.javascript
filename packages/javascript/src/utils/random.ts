import type { RandomGenerator } from '@hawk.so/core';

/**
 * Browser implementation of {@link RandomGenerator} backed by the Web Crypto API.
 */
export class BrowserRandomGenerator implements RandomGenerator {
  /**
   * Generates a sequence of cryptographically secure random unsigned numbers.
   *
   * @param length - Length of the generated sequence.
   * @returns Array filled with random unsigned numbers.
   * @remarks Uses {@link Crypto.getRandomValues} under the hood.
   */
  public getRandomNumbers(length: number): Uint8Array<ArrayBuffer> {
    const array = new Uint8Array(length);

    return window.crypto.getRandomValues(array);
  }
}
