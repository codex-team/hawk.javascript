import type { VueIntegrationAddons } from '@hawk.so/types';

/**
 * The Vue integration will append this data to the addons
 */
export type VueIntegrationData = {
  vue: VueIntegrationAddons;
};

/**
 * Union Type for available integrations
 */
export type JavaScriptCatcherIntegrations =
  | VueIntegrationData
;
