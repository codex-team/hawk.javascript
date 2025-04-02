import type { EncodedIntegrationToken } from '@hawk.so/types';
import type { AggregatedTransaction } from './transaction';

/**
 * Interface for performance monitoring message
 */
export interface PerformanceMessage {
  /**
   * Integration token
   */
  token: EncodedIntegrationToken;

  /**
   * Type of the catcher that sent this message
   */
  catcherType: 'performance';

  /**
   * Performance monitoring data
   */
  payload: {
    transactions: AggregatedTransaction[];
  };
}
