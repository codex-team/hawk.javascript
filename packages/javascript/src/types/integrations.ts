import type { VueIntegrationAddons } from '@hawk.so/types';

/**
 * The Vue integration will append this data to the addons
 */
export type VueIntegrationData = {
  vue: VueIntegrationAddons;
};

/**
 * Useful info extracted from Nuxt app
 */
export type NuxtIntegrationAddons = {
  'Component': string | null;
  'Route': {
    path: string;
    fullPath: string;
    name?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    redirectedFrom?: string | Record<string, any>;
  },
  'Props': {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  },
  'Source': string;
};

/**
 * The Nuxt integration will append this data to the addons
 */
export type NuxtIntegrationData = {
  nuxt: NuxtIntegrationAddons;
};

/**
 * Union Type for available integrations
 */
export type JavaScriptCatcherIntegrations =
  | VueIntegrationData
  | NuxtIntegrationData
;
