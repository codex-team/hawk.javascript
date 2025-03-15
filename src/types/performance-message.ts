import type { Transaction } from './transaction';
import type { EncodedIntegrationToken } from '@hawk.so/types';

/**
 * Interface for performance monitoring message payload
 */
export interface PerformancePayload extends Transaction {
  /**
   * Version of the catcher that sent this message
   */
  catcherVersion: string;
}

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
  payload: PerformancePayload;
}
