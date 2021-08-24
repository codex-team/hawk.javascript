
/**
 * Fields in decoded integration JWT token
 */
export default interface DecodedIntegrationToken {
  /**
   * Integration id of project
   */
  integrationId: string;

  /**
   * Secret hash
   */
  secret: string;
}
