import type { CatcherMessage, CatcherMessageType } from '@hawk.so/types';

/**
 * Transport interface — anything that can send a CatcherMessage
 */
export interface Transport<T extends CatcherMessageType = 'errors/javascript'> {
  send(message: CatcherMessage<T>): Promise<void>;
}
