import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CatcherMessage } from '@hawk.so/types';
import { EventDedupeTransport } from '../../src';
import type { Transport } from '../../src';

function makeTransport(): { send: ReturnType<typeof vi.fn>; transport: Transport } {
  const send = vi.fn().mockResolvedValue(undefined);

  return { send,
    transport: { send } };
}

function makeMessage(
  title: string,
  catcherType: CatcherMessage<'errors/javascript'>['catcherType'] = 'errors/javascript'
): CatcherMessage<'errors/javascript'> {
  return {
    token: 'test-token',
    catcherType,
    payload: {
      title,
    } as CatcherMessage<'errors/javascript'>['payload'],
  };
}

const WINDOW_MS = 5_000;

describe('EventDedupeTransport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('debouncing', () => {
    it('should not forward event until window expires', async () => {
      const { send, transport } = makeTransport();
      const debouncer = new EventDedupeTransport(transport, { windowMs: WINDOW_MS });

      await debouncer.send(makeMessage('TypeError'));
      expect(send).not.toHaveBeenCalled();

      vi.advanceTimersByTime(WINDOW_MS);
      await Promise.resolve();

      expect(send).toHaveBeenCalledOnce();
    });

    it('should forward single occurrence without count field', async () => {
      const { send, transport } = makeTransport();
      const debouncer = new EventDedupeTransport(transport, { windowMs: WINDOW_MS });

      await debouncer.send(makeMessage('TypeError'));
      vi.advanceTimersByTime(WINDOW_MS);
      await Promise.resolve();

      expect(send.mock.calls[0][0].count).toBeUndefined();
    });

    it('should accumulate duplicates and forward with count', async () => {
      const { send, transport } = makeTransport();
      const debouncer = new EventDedupeTransport(transport, { windowMs: WINDOW_MS });

      const first = makeMessage('TypeError');
      const second = makeMessage('TypeError');

      second.token = 'other-token';

      await debouncer.send(first);
      await debouncer.send(second);
      await debouncer.send(first);

      vi.advanceTimersByTime(WINDOW_MS);
      await Promise.resolve();

      expect(send).toHaveBeenCalledOnce();

      const sent: CatcherMessage<'errors/javascript'> = send.mock.calls[0][0];

      expect(sent.count).toBe(3);
      expect(sent.token).toBe('test-token');
    });

    it('should forward distinct events separately', async () => {
      const { send, transport } = makeTransport();
      const debouncer = new EventDedupeTransport(transport, { windowMs: WINDOW_MS });

      await debouncer.send(makeMessage('TypeError'));
      await debouncer.send(makeMessage('ReferenceError'));

      vi.advanceTimersByTime(WINDOW_MS);
      await Promise.resolve();

      expect(send).toHaveBeenCalledTimes(2);
    });

    it('should treat events with different catcherType as distinct', async () => {
      const { send, transport } = makeTransport();
      const debouncer = new EventDedupeTransport(transport as Transport<'errors/javascript'>, { windowMs: WINDOW_MS });

      const msg1 = makeMessage('TypeError', 'errors/javascript');
      const msg2 = { ...makeMessage('TypeError'),
        catcherType: 'errors/nodejs' } as unknown as CatcherMessage<'errors/javascript'>;

      await debouncer.send(msg1);
      await debouncer.send(msg2);

      vi.advanceTimersByTime(WINDOW_MS);
      await Promise.resolve();

      expect(send).toHaveBeenCalledTimes(2);
    });
  });

  describe('independent timers per event', () => {
    it('should fire each event signature on its own timer', async () => {
      const { send, transport } = makeTransport();
      const debouncer = new EventDedupeTransport(transport, { windowMs: WINDOW_MS });

      await debouncer.send(makeMessage('TypeError'));
      vi.advanceTimersByTime(2_000);
      await debouncer.send(makeMessage('ReferenceError'));

      vi.advanceTimersByTime(3_000);
      await Promise.resolve();

      expect(send).toHaveBeenCalledOnce();
      expect(send.mock.calls[0][0].payload.title).toBe('TypeError');

      vi.advanceTimersByTime(2_000);
      await Promise.resolve();

      expect(send).toHaveBeenCalledTimes(2);
      expect(send.mock.calls[1][0].payload.title).toBe('ReferenceError');
    });

    it('should start fresh window after previous one expires', async () => {
      const { send, transport } = makeTransport();
      const debouncer = new EventDedupeTransport(transport, { windowMs: WINDOW_MS });
      const message = makeMessage('TypeError');

      await debouncer.send(message);
      vi.advanceTimersByTime(WINDOW_MS);
      await Promise.resolve();
      expect(send).toHaveBeenCalledOnce();
      send.mockClear();

      await debouncer.send(message);
      await debouncer.send(message);
      vi.advanceTimersByTime(WINDOW_MS);
      await Promise.resolve();

      expect(send).toHaveBeenCalledOnce();
      expect(send.mock.calls[0][0].count).toBe(2);
    });
  });

  describe('flush', () => {
    it('should forward all buffered events immediately', async () => {
      const { send, transport } = makeTransport();
      const debouncer = new EventDedupeTransport(transport, { windowMs: WINDOW_MS });

      await debouncer.send(makeMessage('TypeError'));
      await debouncer.send(makeMessage('TypeError'));
      await debouncer.send(makeMessage('ReferenceError'));
      expect(send).not.toHaveBeenCalled();

      debouncer.flush();
      await Promise.resolve();

      expect(send).toHaveBeenCalledTimes(2);
    });

    it('should not re-send after flush when timers fire', async () => {
      const { send, transport } = makeTransport();
      const debouncer = new EventDedupeTransport(transport, { windowMs: WINDOW_MS });

      await debouncer.send(makeMessage('TypeError'));
      debouncer.flush();

      vi.advanceTimersByTime(WINDOW_MS);
      await Promise.resolve();

      expect(send).toHaveBeenCalledOnce();
    });

    it('should be safe to call on empty buffer', () => {
      const { transport } = makeTransport();
      const debouncer = new EventDedupeTransport(transport);

      expect(() => debouncer.flush()).not.toThrow();
    });
  });
});
