import { describe, expect, it, vi } from 'vitest';
import { ConsoleCatcherMessageProcessor } from '../../src/messages/console-catcher-message-processor';
import { makePayload } from './message-processor.helpers';

const makeConsoleCatcher = (logs: any[]) => ({
  init: vi.fn(),
  getConsoleLogStack: vi.fn().mockReturnValue(logs),
  addErrorEvent: vi.fn(),
});

describe('ConsoleCatcherMessageProcessor', () => {
  it('should attach console logs to payload addons', () => {
    const logs = [{ message: 'hello', type: 'log' }];
    const processor = new ConsoleCatcherMessageProcessor(makeConsoleCatcher(logs) as any);

    const result = processor.apply(makePayload({ addons: {} as any }));

    expect(result?.addons?.consoleOutput).toEqual(logs);
  });

  it('should not add consoleOutput when log stack is empty', () => {
    const processor = new ConsoleCatcherMessageProcessor(makeConsoleCatcher([]) as any);

    const result = processor.apply(makePayload({ addons: {} as any }));

    expect(result?.addons?.consoleOutput).toBeUndefined();
  });

  it('should return payload unchanged when payload has no addons', () => {
    const processor = new ConsoleCatcherMessageProcessor(makeConsoleCatcher([{ message: 'x' }]) as any);
    const payload = makePayload();

    const result = processor.apply(payload);

    expect(result).toBe(payload);
    expect(result?.addons).toBeUndefined();
  });
});
