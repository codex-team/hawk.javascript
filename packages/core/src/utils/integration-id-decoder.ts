import type { DecodedIntegrationToken, EncodedIntegrationToken } from '@hawk.so/types';

/**
 * Decodes and returns integration id from integration token.
 * Also checks is integration ID valid.
 *
 * @param token - encoded integration token
 */
export function decodeIntegrationId(token: EncodedIntegrationToken): string {
  const integrationId = decodeIntegrationToken(token);

  if (!integrationId || integrationId === '') {
    throw new Error('Invalid integration token.');
  }

  return integrationId;
}

/**
 * Decodes and returns integration id from integration token.
 *
 * @param token - encoded integration token
 */
function decodeIntegrationToken(token: EncodedIntegrationToken): string {
  try {
    const decodedIntegrationToken: DecodedIntegrationToken = JSON.parse(atob(token));
    const { integrationId } = decodedIntegrationToken;

    return integrationId;
  } catch {
    throw new Error('Invalid integration token.');
  }
}
