import type { CatcherMessage } from '@hawk.so/types';
import { CatcherMessageType } from '@hawk.so/types';

/**
 * Transport interface — anything that can send a CatcherMessage
 */
export interface Transport<T extends CatcherMessageType> {
  send(message: CatcherMessage<T>): Promise<void>;
}
