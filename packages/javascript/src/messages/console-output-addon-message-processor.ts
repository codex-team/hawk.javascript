import type { MessageProcessor, ProcessingPayload } from '@hawk.so/core';
import type { ConsoleCatcher } from '../addons/consoleCatcher';

/**
 * Attaches captured console output to payload addons.
 */
export class ConsoleOutputAddonMessageProcessor implements MessageProcessor<'errors/javascript'> {
  private readonly consoleCatcher: ConsoleCatcher;

  /**
   * Stores catcher reference and starts console interception.
   *
   * @param consoleCatcher - console catcher instance to read logs from
   */
  constructor(consoleCatcher: ConsoleCatcher) {
    this.consoleCatcher = consoleCatcher;
    this.consoleCatcher.init();
  }

  /**
   * Attaches current console log stack to `payload.addons.consoleOutput`.
   * Skips if log stack is empty.
   *
   * @param payload - event message payload to enrich
   * @returns modified payload with console logs attached, or original payload unchanged
   */
  public apply(
    payload: ProcessingPayload<'errors/javascript'>
  ): ProcessingPayload<'errors/javascript'> | null {
    const logs = this.consoleCatcher?.getConsoleLogStack();

    if (logs && logs.length > 0) {
      payload.addons.consoleOutput = logs;
    }

    return payload;
  }
}
