import { describe, expect, it, vi } from 'vitest';
import { createCatcher, createTransport, getLastPayload, wait } from './catcher.helpers';
import { MessageProcessor, ProcessingPayload } from '@hawk.so/core';

const mockParse = vi.hoisted(() => vi.fn().mockResolvedValue([]));
vi.mock('../src/modules/stackParser', () => ({
  default: class {
    parse = mockParse;
  }
}));

describe('Catcher', () => {
  describe('message processor', () => {
    it('should send original message when processor does not modify it', async () => {
      const { sendSpy, transport } = createTransport();
      const applySpy = vi.fn((payload: ProcessingPayload<'errors/javascript'>) => payload);
      const processor: MessageProcessor<'errors/javascript'> = { apply: applySpy };
      const hawk = createCatcher(transport, { messageProcessors: [processor] });

      hawk.send('original message');
      await wait();

      expect(applySpy).toHaveBeenCalledTimes(1);
      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(getLastPayload(sendSpy).message).toBe('original message');
    });

    it('should send modified message when processor modify it', async () => {
      const { sendSpy, transport } = createTransport();
      const applySpy = vi.fn((payload: ProcessingPayload<'errors/javascript'>) => {
        return {
          ...payload,
          message: 'modified message',
        };
      });
      const processor: MessageProcessor<'errors/javascript'> = { apply: applySpy, };
      const hawk = createCatcher(transport, { messageProcessors: [processor], });

      hawk.send('original message');
      await wait();

      expect(applySpy).toHaveBeenCalledTimes(1);
      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(getLastPayload(sendSpy).message).toBe('modified message');
    });

    it('should drop message when processor returns null', async () => {
      const { sendSpy, transport } = createTransport();
      const applySpy = vi.fn(() => null);
      const processor: MessageProcessor<'errors/javascript'> = { apply: applySpy, };
      const hawk = createCatcher(transport, { messageProcessors: [processor], });

      hawk.send('test error');
      await wait();

      expect(applySpy).toHaveBeenCalledTimes(1);
      expect(sendSpy).not.toHaveBeenCalled();
    });
  });
});
