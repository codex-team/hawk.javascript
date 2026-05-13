import type { CatcherMessagePayload } from '@hawk.so/types';
import type { ErrorsCatcherType } from '@hawk.so/types/src/catchers/catcher-message';

/**
 * Event will be sent to Hawk by Hawk JavaScript SDK
 */
export type HawkJavaScriptEvent<T extends ErrorsCatcherType = 'errors/javascript'> = CatcherMessagePayload<T>;
