import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HawkTraceManager } from '../../src';
import type { RandomGenerator } from '../../src';

vi.mock('../../src/utils/logger', () => ({
  log: vi.fn(),
  isLoggerSet: vi.fn(() => false),
  setLogger: vi.fn(),
  resetLogger: vi.fn(),
}));

describe('HawkTraceManager', () => {
  let randomGenerator: RandomGenerator;
  let manager: HawkTraceManager;

  beforeEach(() => {
    randomGenerator = {
      getRandomNumbers: vi.fn().mockReturnValue(new Uint8Array(40).fill(42)),
    };
    manager = new HawkTraceManager(randomGenerator);
  });

  it('should lazily generate trace id on first access', () => {
    const traceId = manager.getTraceId();

    expect(traceId).toBeTruthy();
    expect(traceId).toMatch(/^[0-9a-z]+-/);
    expect(manager.getTraceId()).toBe(traceId);
  });

  it('should return trace payload for events', () => {
    manager.adoptTraceId('mabc123-550e8400-e29b-41d4-a716-446655440000');

    expect(manager.getEventTrace()).toEqual({
      id: 'mabc123-550e8400-e29b-41d4-a716-446655440000',
    });
  });

  it('should adopt valid propagated trace id', () => {
    manager.adoptTraceId(' mabc123-550e8400-e29b-41d4-a716-446655440000 ');

    expect(manager.getTraceId()).toBe('mabc123-550e8400-e29b-41d4-a716-446655440000');
  });

  it('should ignore invalid propagated trace id', () => {
    const initialTraceId = manager.getTraceId();

    manager.adoptTraceId('same-word-for-everyone');

    expect(manager.getTraceId()).toBe(initialTraceId);
  });

  it('should generate a new trace id after resetTraceId()', () => {
    const firstTraceId = manager.getTraceId();

    manager.resetTraceId();

    expect(manager.getTraceId()).not.toBe(firstTraceId);
  });
});
