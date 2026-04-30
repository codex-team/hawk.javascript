import { describe, expect, it, vi } from 'vitest';
import { ConsoleOutputAddonMessageProcessor } from '../../src/messages/console-output-addon-message-processor';
import { makePayload } from './message-processor.helpers';

const makeConsoleCatcher = (logs: any[]) => ({
  init: vi.fn(),
  getConsoleLogStack: vi.fn().mockReturnValue(logs),
  addErrorEvent: vi.fn(),
});

describe('ConsoleCatcherMessageProcessor', () => {
  it('should attach console logs to payload addons', () => {
    const logs = [{ message: 'hello', type: 'log' }];
    const processor = new ConsoleOutputAddonMessageProcessor(makeConsoleCatcher(logs) as any);

    const result = processor.apply(makePayload());

    expect(result?.addons?.consoleOutput).toEqual(logs);
  });

  it('should not add consoleOutput when log stack is empty', () => {
    const processor = new ConsoleOutputAddonMessageProcessor(makeConsoleCatcher([]) as any);

    const result = processor.apply(makePayload());

    expect(result?.addons?.consoleOutput).toBeUndefined();
  });
});
