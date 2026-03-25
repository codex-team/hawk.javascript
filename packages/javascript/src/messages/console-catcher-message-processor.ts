import type { MessageProcessor } from '@hawk.so/core';
import type { CatcherMessagePayload } from '@hawk.so/types';
import type { ConsoleCatcher } from '../addons/consoleCatcher';

/**
 * Attaches captured console output to payload addons.
 */
export class ConsoleCatcherMessageProcessor implements MessageProcessor<'errors/javascript'> {
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
   * Skips if `payload.addons` is absent or log stack is empty.
   *
   * @param payload - event message payload to enrich
   * @returns modified payload with console logs attached, or original payload unchanged
   */
  public apply(
    payload: CatcherMessagePayload<'errors/javascript'>
  ): CatcherMessagePayload<'errors/javascript'> | null {
    if (!payload.addons) {
      return payload;
    }

    const logs = this.consoleCatcher?.getConsoleLogStack();

    if (logs && logs.length > 0) {
      payload.addons.consoleOutput = logs;
    }

    return payload;
  }
}
