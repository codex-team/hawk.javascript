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
 *  "pass-through" → return event as-is
 *  "modify"       → mutate context, return event
 *  "drop"         → return false
 *  "void"         → no return (undefined)
 *  "null"         → return null
 *  "invalid"      → return true
 *  "empty-obj"    → return {}
 *  "optional"     → delete release, return event
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

      case 'void':
        return;

      case 'null':
        return null as any;

      case 'invalid':
        return true as any;

      case 'empty-obj':
        return {} as any;

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

  it('return event → event sent', async () => {
    hawk.send(new Error('pass-through'));
    await flush();

    expect(socketSendSpy).toHaveBeenCalledOnce();

    const payload = getSentPayload()!;

    expect(payload.title).toBe('pass-through');
    expect(payload.backtrace).toBeInstanceOf(Array);
  });

  it('return modified event → sent event with changes', async () => {
    hawk.send(new Error('modify'));
    await flush();

    expect(socketSendSpy).toHaveBeenCalledOnce();

    const payload = getSentPayload()!;

    expect(payload.title).toBe('modify');
    expect(payload.context).toEqual({ sanitized: true });
  });

  it('return false → event not sent', async () => {
    hawk.send(new Error('drop'));
    await flush();

    expect(socketSendSpy).not.toHaveBeenCalled();
  });

  it('return undefined → sent original event + warn', async () => {
    hawk.send(new Error('void'));
    await flush();

    expect(socketSendSpy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Hawk] Invalid beforeSend value: (undefined)'),
      expect.anything(),
      expect.anything()
    );
    expect(getSentPayload()!.title).toBe('void');
  });

  it('return null → sent original event + warn', async () => {
    hawk.send(new Error('null'));
    await flush();

    expect(socketSendSpy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Hawk] Invalid beforeSend value: (null)'),
      expect.anything(),
      expect.anything()
    );
    expect(getSentPayload()!.title).toBe('null');
  });

  it('return true → sent original event + warn', async () => {
    hawk.send(new Error('invalid'));
    await flush();

    expect(socketSendSpy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Hawk] beforeSend produced invalid payload'),
      expect.anything(),
      expect.anything()
    );
    expect(getSentPayload()!.title).toBe('invalid');
  });

  it('return {} → sent original event + warn', async () => {
    hawk.send(new Error('empty-obj'));
    await flush();

    expect(socketSendSpy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Hawk] beforeSend produced invalid payload'),
      expect.anything(),
      expect.anything()
    );
    expect(getSentPayload()!.title).toBe('empty-obj');
  });

  it('delete optional fields → sent event without them', async () => {
    hawk.send(new Error('optional'));
    await flush();

    expect(socketSendSpy).toHaveBeenCalledOnce();

    const payload = getSentPayload()!;

    expect(payload.title).toBe('optional');
    expect(payload.release).toBeUndefined();
  });
});
