/**
 * Wraps an async function so that concurrent calls share the same in-flight
 * Promise. Once the Promise settles, the next call starts fresh.
 *
 * @param fn - The async function to guard against concurrent execution
 * @returns {Function} A wrapped version of fn that never runs concurrently with itself
 */
export function singleFlight<T>(fn: () => Promise<T>): () => Promise<T> {
  let inFlight: Promise<T> | null = null;

  return (): Promise<T> => {
    if (inFlight === null) {
      inFlight = fn().finally(() => {
        inFlight = null;
      });
    }

    return inFlight;
  };
}
