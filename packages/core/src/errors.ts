/**
 * Error triggered when event was rejected by beforeSend method
 */
export class EventRejectedError extends Error {
  /**
   * @param message - error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'EventRejectedError';
  }
}
