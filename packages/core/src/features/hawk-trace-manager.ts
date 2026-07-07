import type { EventTrace } from '@hawk.so/types';
import { id } from '../utils/id';
import { log } from '../utils/logger';
import type { RandomGenerator } from '../utils/random';

/**
 * Default random generator used when no platform-specific implementation is provided.
 */
class DefaultRandomGenerator implements RandomGenerator {
  /**
   * Generates sequence of random unsigned numbers.
   *
   * @param length - length of generated sequence
   */
  public getRandomNumbers(length: number): Uint8Array<ArrayBuffer> {
    const values = new Uint8Array(length);

    for (let index = 0; index < length; index++) {
      values[index] = Math.floor(Math.random() * 256);
    }

    return values;
  }
}

/**
 * Manages current distributed trace id for outgoing events and HTTP propagation.
 */
export class HawkTraceManager {
  /**
   * Current trace id, lazily generated on first access.
   */
  private traceId: string | null = null;

  /**
   * Random generator used when crypto.randomUUID is unavailable.
   */
  private readonly randomGenerator: RandomGenerator;

  /**
   * @param randomGenerator - optional platform-specific random source
   */
  constructor(randomGenerator?: RandomGenerator) {
    this.randomGenerator = randomGenerator ?? new DefaultRandomGenerator();
  }

  /**
   * Returns current trace id, generating one when missing.
   */
  public getTraceId(): string {
    if (!this.traceId) {
      this.traceId = this.generateTraceId();
    }

    return this.traceId;
  }

  /**
   * Returns trace payload for event attachment.
   */
  public getEventTrace(): EventTrace {
    return {
      id: this.getTraceId(),
    };
  }

  /**
   * Adopts trace id from an incoming HTTP header.
   * Ignores values that do not match SDK-generated trace id format.
   *
   * @param traceId - trace id propagated by another Hawk SDK instance
   */
  public adoptTraceId(traceId: string): void {
    const normalizedTraceId = traceId.trim();

    if (!this.isValidTraceId(normalizedTraceId)) {
      log('adoptTraceId: invalid trace id, ignoring value', 'warn');

      return;
    }

    this.traceId = normalizedTraceId;
  }

  /**
   * Clears current trace id so the next access generates a new one.
   */
  public resetTraceId(): void {
    this.traceId = null;
  }

  /**
   * Generates a new trace id with a time component to reduce collision risk.
   */
  private generateTraceId(): string {
    const timePart = Date.now().toString(36);
    const randomPart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : id(this.randomGenerator);

    return `${timePart}-${randomPart}`;
  }

  /**
   * Validates trace id shape produced by {@link generateTraceId}.
   *
   * @param traceId - candidate trace id
   */
  private isValidTraceId(traceId: string): boolean {
    return /^[0-9a-z]+-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(traceId)
      || /^[0-9a-z]+-[A-Za-z0-9]{20,}$/.test(traceId);
  }
}
