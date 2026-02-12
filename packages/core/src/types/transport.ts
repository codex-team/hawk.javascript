import type { CatcherMessage } from './catcher-message';

/**
 * Transport interface — anything that can send a CatcherMessage
 */
export interface Transport {
  send(message: CatcherMessage): Promise<void>;
}
