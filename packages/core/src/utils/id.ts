import type { RandomGenerator } from './random';

/**
 * Returns random string
 *
 * @param random
 */
export function id(random: RandomGenerator): string {
  const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  const randomSequence = random
    .getRandomNumbers(40)
    .map(x => validChars.charCodeAt(x % validChars.length));

  return String.fromCharCode.apply(null, randomSequence);
}
