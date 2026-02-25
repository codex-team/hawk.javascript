import { vi } from 'vitest';
import Catcher from '../src/catcher';
import type { Transport } from '../src';

export const TEST_TOKEN = 'eyJpbnRlZ3JhdGlvbklkIjoiOTU3MmQyOWQtNWJhZS00YmYyLTkwN2MtZDk5ZDg5MGIwOTVmIiwic2VjcmV0IjoiZTExODFiZWItMjdlMS00ZDViLWEwZmEtZmUwYTM1Mzg5OWMyIn0=';
export const wait = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

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
