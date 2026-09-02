import { vi } from 'vitest';
import Catcher from '../src/catcher';
import type { Transport } from '../src';
import type { MessageProcessor } from '@hawk.so/core';
import { DEFAULT_EVENT_DEDUPE_WINDOW_MS } from '@hawk.so/core';

export const TEST_TOKEN = 'eyJpbnRlZ3JhdGlvbklkIjoiOTU3MmQyOWQtNWJhZS00YmYyLTkwN2MtZDk5ZDg5MGIwOTVmIiwic2VjcmV0IjoiZTExODFiZWItMjdlMS00ZDViLWEwZmEtZmUwYTM1Mzg5OWMyIn0=';

/**
 * Advances past the Catcher's default EventDedupeTransport window so buffered
 * events are forwarded to the underlying transport. Requires fake timers
 * (`vi.useFakeTimers()`) to be active in the calling test file.
 */
export const wait = (): Promise<void> => vi.advanceTimersByTimeAsync(DEFAULT_EVENT_DEDUPE_WINDOW_MS);

export function createTransport() {
  const sendSpy = vi.fn().mockResolvedValue(undefined);
  const transport: Transport = { send: sendSpy };

  return { sendSpy, transport };
}

/** Returns the payload of the last call to transport.send. */
export function getLastPayload(spy: ReturnType<typeof vi.fn>) {
  const calls = spy.mock.calls;

  return calls[calls.length - 1][0].payload;
}

export function injectProcessor(catcher: Catcher, processor: MessageProcessor<'errors/javascript'>): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (catcher as any).messageProcessors.push(processor);
}

export function createCatcher(transport: Transport, options: Record<string, unknown> = {}) {
  return new Catcher({
    token: TEST_TOKEN,
    disableGlobalErrorsHandling: true,
    breadcrumbs: false,
    consoleTracking: false,
    transport,
    ...options,
  });
}
