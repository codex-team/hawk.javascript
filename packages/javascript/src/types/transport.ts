import type { Transport as HawkTransport } from '@hawk.so/core';

/**
 * Transport interface — anything that can send a {@link CatcherMessage}.
 */
export interface Transport extends HawkTransport<'errors/javascript'> {
}
