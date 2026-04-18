/**
 * Abstraction over random value generator.
 * Allows platform-specific implementations to be injected wherever random values are needed.
 */
export interface RandomGenerator {
    /**
     * Generates sequence of random unsigned numbers.
     *
     * @param length - Length of generated sequence.
     * @returns Array filled with random unsigned numbers.
     */
    getRandomNumbers(length: number): Uint8Array<ArrayBuffer>;
}
