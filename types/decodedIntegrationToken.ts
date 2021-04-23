import { JwtPayload } from 'jwt-decode';

/**
 * Fields in decoded integration JWT token
 */
export default interface DecodedIntegrationToken extends JwtPayload {
  /**
   * Id of catcher's project
   */
  projectId: string;
}
