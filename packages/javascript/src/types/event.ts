import type { CatcherMessagePayload } from '@hawk.so/types';

/**
 * Event will be sent to Hawk by Hawk JavaScript SDK
 */
export type HawkJavaScriptEvent = CatcherMessagePayload<'errors/javascript'>;
