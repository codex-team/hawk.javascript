import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CatcherMessage } from '@hawk.so/types';
import { EventBatcher } from '../../src/utils/event-batcher';
import type { Transport } from '../../src/utils/transport';

function makeTransport(): { send: ReturnType<typeof vi.fn>; transport: Transport } {
  const send = vi.fn().mockResolvedValue(undefined);
  return { send, transport: { send } };
}

function makeMessage(
  title: string,
  type = 'Error',
  frames: Array<{ file: string; line: number; column?: number; function?: string }> = []
): CatcherMessage<'errors/javascript'> {
  return {
    token: 'test-token',
    catcherType: 'errors/javascript',
    payload: {
      title,
      type,
      backtrace: frames.map(f => ({
        file: f.file,
        line: f.line,
        column: f.column,
        function: f.function,
      })),
    } as CatcherMessage<'errors/javascript'>['payload'],
  };
}

const FRAME = { file: 'app.js', line: 10, column: 5, function: 'onClick' };

describe('EventBatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('batching identical events', () => {
    it('should buffer events until flush interval expires', async () => {
      const { send, transport } = makeTransport();
      const batcher = new EventBatcher(transport, { flushIntervalMs: 5_000 });

      await batcher.send(makeMessage('TypeError', 'TypeError', [FRAME]));
      expect(send).not.toHaveBeenCalled();

      vi.advanceTimersByTime(5_000);
      await Promise.resolve();

      expect(send).toHaveBeenCalledOnce();
    });

    it('should omit count for single occurrence', async () => {
      const { send, transport } = makeTransport();
      const batcher = new EventBatcher(transport, { flushIntervalMs: 5_000 });

      await batcher.send(makeMessage('TypeError', 'TypeError', [FRAME]));
      vi.advanceTimersByTime(5_000);
      await Promise.resolve();

      const sent: CatcherMessage<'errors/javascript'> = send.mock.calls[0][0];

      expect(sent.count).toBeUndefined();
    });

    it('should send once with correct count and preserve first occurrence data', async () => {
      const { send, transport } = makeTransport();
      const batcher = new EventBatcher(transport, { flushIntervalMs: 5_000 });

      const first = makeMessage('TypeError', 'TypeError', [FRAME]);
      const second = makeMessage('TypeError', 'TypeError', [FRAME]);
      second.token = 'other-token';

      await batcher.send(first);
      await batcher.send(second);
      await batcher.send(first);

      vi.advanceTimersByTime(5_000);
      await Promise.resolve();

      expect(send).toHaveBeenCalledOnce();

      const sent: CatcherMessage<'errors/javascript'> = send.mock.calls[0][0];

      expect(sent.count).toBe(3);
      expect(sent.token).toBe('test-token');
    });
  });

  describe('grouping by signature', () => {
    it('should send separate events for distinct error types', async () => {
      const { send, transport } = makeTransport();
      const batcher = new EventBatcher(transport, { flushIntervalMs: 5_000 });

      await batcher.send(makeMessage('TypeError', 'TypeError', [FRAME]));
      await batcher.send(makeMessage('ReferenceError', 'ReferenceError', [FRAME]));

      vi.advanceTimersByTime(5_000);
      await Promise.resolve();

      expect(send).toHaveBeenCalledTimes(2);
    });

    it('should treat same error at different frame line as distinct', async () => {
      const { send, transport } = makeTransport();
      const batcher = new EventBatcher(transport, { flushIntervalMs: 5_000 });

      await batcher.send(makeMessage('TypeError', 'TypeError', [{ file: 'app.js', line: 10 }]));
      await batcher.send(makeMessage('TypeError', 'TypeError', [{ file: 'app.js', line: 20 }]));

      vi.advanceTimersByTime(5_000);
      await Promise.resolve();

      expect(send).toHaveBeenCalledTimes(2);
    });

    it('should batch identical and send distinct separately', async () => {
      const { send, transport } = makeTransport();
      const batcher = new EventBatcher(transport, { flushIntervalMs: 5_000 });

      const typeError = makeMessage('TypeError', 'TypeError', [FRAME]);
      const refError = makeMessage('ReferenceError', 'ReferenceError', [FRAME]);

      await batcher.send(typeError);
      await batcher.send(refError);
      await batcher.send(typeError);
      await batcher.send(typeError);

      vi.advanceTimersByTime(5_000);
      await Promise.resolve();

      expect(send).toHaveBeenCalledTimes(2);

      const sentMessages = send.mock.calls.map(c => c[0] as CatcherMessage<'errors/javascript'>);
      const typeErrorSent = sentMessages.find(m => m.payload.title === 'TypeError');
      const refErrorSent = sentMessages.find(m => m.payload.title === 'ReferenceError');

      expect(typeErrorSent?.count).toBe(3);
      expect(refErrorSent?.count).toBeUndefined();
    });

    it('should batch events without backtrace', async () => {
      const { send, transport } = makeTransport();
      const batcher = new EventBatcher(transport, { flushIntervalMs: 5_000 });

      const message = makeMessage('Script error.');
      message.payload.backtrace = undefined;

      await batcher.send(message);
      await batcher.send(message);

      vi.advanceTimersByTime(5_000);
      await Promise.resolve();

      expect(send).toHaveBeenCalledOnce();
      expect(send.mock.calls[0][0].count).toBe(2);
    });
  });

  describe('flush triggers', () => {
    it('should force-flush when buffer reaches max size', async () => {
      const { send, transport } = makeTransport();
      const batcher = new EventBatcher(transport, { flushIntervalMs: 60_000, maxBufferSize: 3 });

      await batcher.send(makeMessage('Error A', 'Error', [{ file: 'a.js', line: 1 }]));
      await batcher.send(makeMessage('Error B', 'Error', [{ file: 'b.js', line: 1 }]));
      expect(send).not.toHaveBeenCalled();

      await batcher.send(makeMessage('Error C', 'Error', [{ file: 'c.js', line: 1 }]));
      await Promise.resolve();

      expect(send).toHaveBeenCalledTimes(3);
    });

    it('should flush immediately on explicit call', async () => {
      const { send, transport } = makeTransport();
      const batcher = new EventBatcher(transport, { flushIntervalMs: 60_000 });

      await batcher.send(makeMessage('TypeError', 'TypeError', [FRAME]));
      await batcher.send(makeMessage('TypeError', 'TypeError', [FRAME]));
      expect(send).not.toHaveBeenCalled();

      batcher.flush();
      await Promise.resolve();

      expect(send).toHaveBeenCalledOnce();
      expect(send.mock.calls[0][0].count).toBe(2);
    });

    it('should not re-flush after explicit call empties buffer', async () => {
      const { send, transport } = makeTransport();
      const batcher = new EventBatcher(transport, { flushIntervalMs: 5_000 });

      await batcher.send(makeMessage('TypeError', 'TypeError', [FRAME]));
      batcher.flush();

      vi.advanceTimersByTime(5_000);
      await Promise.resolve();

      expect(send).toHaveBeenCalledOnce();
    });

    it('should send fresh batch after flush', async () => {
      const { send, transport } = makeTransport();
      const batcher = new EventBatcher(transport, { flushIntervalMs: 5_000 });
      const message = makeMessage('TypeError', 'TypeError', [FRAME]);

      await batcher.send(message);
      vi.advanceTimersByTime(5_000);
      await Promise.resolve();
      expect(send).toHaveBeenCalledOnce();
      send.mockClear();

      await batcher.send(message);
      await batcher.send(message);
      vi.advanceTimersByTime(5_000);
      await Promise.resolve();

      expect(send).toHaveBeenCalledOnce();
      expect(send.mock.calls[0][0].count).toBe(2);
    });
  });
});
