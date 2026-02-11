import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CatcherMessage } from '../src/types/catcher-message';
import type { HawkJavaScriptEvent } from '../src/types/event';
import Catcher from '../src/catcher';

/**
 * Mock Socket — replaces WebSocket transport with a simple spy.
 */
const socketSendSpy = vi.fn<(msg: CatcherMessage) => Promise<void>>().mockResolvedValue(undefined);

vi.mock('../src/modules/socket', () => ({
  default: class FakeSocket {
    send = socketSendSpy;
    constructor() { /* noop */ }
  },
}));

/**
 * Valid base64-encoded integration token (Socket is mocked — nothing is sent)
 */
const TEST_TOKEN = 'eyJpbnRlZ3JhdGlvbklkIjoiOTU3MmQyOWQtNWJhZS00YmYyLTkwN2MtZDk5ZDg5MGIwOTVmIiwic2VjcmV0IjoiZTExODFiZWItMjdlMS00ZDViLWEwZmEtZmUwYTM1Mzg5OWMyIn0=';

/**
 * Flush microtask queue so fire-and-forget async calls complete
 */
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

/**
 * Extract payload from the last socket.send() call
 */
function getSentPayload(): HawkJavaScriptEvent | null {
  const calls = socketSendSpy.mock.calls;

  return calls.length ? calls[calls.length - 1][0].payload : null;
}

/**
 * Single Catcher instance. beforeSend routes by event.title:
 *
 *  "modify"  → mutate context, return event
 *  "drop"    → return false
 *  "invalid" → return undefined (no return)
 *  "optional"→ delete release, return event
 *  default   → return event as-is
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hawk = new Catcher({
  token: TEST_TOKEN,
  disableGlobalErrorsHandling: true,
  beforeSend(event) {
    switch (event.title) {
      case 'drop':
        return false;

      case 'modify':
        event.context = { sanitized: true };

        return event;

      case 'invalid':
        return;

      case 'optional':
        delete event.release;

        return event;

      default:
        return event;
    }
  },
});

describe('beforeSend', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    socketSendSpy.mockClear();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('should send event as-is when returned unchanged', async () => {
    hawk.send(new Error('pass-through'));
    await flush();

    expect(socketSendSpy).toHaveBeenCalledOnce();
    expect(getSentPayload()!.title).toBe('pass-through');
  });

  it('should send modified event when hook mutates and returns it', async () => {
    hawk.send(new Error('modify'));
    await flush();

    expect(socketSendSpy).toHaveBeenCalledOnce();
    expect(getSentPayload()!.context).toEqual({ sanitized: true });
  });

  it('should drop event when hook returns false', async () => {
    hawk.send(new Error('drop'));
    await flush();

    expect(socketSendSpy).not.toHaveBeenCalled();
  });

  it('should send original event and warn when hook returns invalid value', async () => {
    hawk.send(new Error('invalid'));
    await flush();

    expect(socketSendSpy).toHaveBeenCalledOnce();
    expect(getSentPayload()!.title).toBe('invalid');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid beforeSend value:'),
      expect.anything(),
      expect.anything()
    );
  });

  it('should send event without deleted optional fields', async () => {
    hawk.send(new Error('optional'));
    await flush();

    expect(socketSendSpy).toHaveBeenCalledOnce();
    expect(getSentPayload()!.release).toBeUndefined();
  });
});
