import type { Transaction } from '../modules/performance';
import type { EncodedIntegrationToken } from '@hawk.so/types';
import type { Span } from '../modules/performance';

/**
 * Interface for performance monitoring message payload
 */
export interface PerformancePayload {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, string>;
  spans: Span[];
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
