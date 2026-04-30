import type { CatcherMessage as HawkCatcherMessage } from '@hawk.so/types';
import type { CatcherMessageType } from '@hawk.so/types/src/catchers/catcher-message';

/**
 * Structure describing a message sending by Catcher
 */
export type CatcherMessage<T extends CatcherMessageType = 'errors/javascript'> = HawkCatcherMessage<T>;
