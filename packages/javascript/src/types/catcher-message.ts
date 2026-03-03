import type { CatcherMessage as HawkCatcherMessage } from '@hawk.so/types';

/**
 * Structure describing a message sending by Catcher
 */
export interface CatcherMessage extends HawkCatcherMessage<'errors/javascript'> {
}
