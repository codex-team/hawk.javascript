/**
 * SvelteKit configuration file
 *
 * This file configures the SvelteKit application build process and runtime behavior.
 * @see {@link https://kit.svelte.dev/docs/configuration}
 */

import {vitePreprocess} from '@sveltejs/vite-plugin-svelte';

/**
 * SvelteKit configuration object
 * @type {import('@sveltejs/kit').Config}
 */
const config = {
  /**
   * Preprocessor configuration
   *
   * Uses Vite's preprocessor to handle TypeScript, PostCSS, and other transformations
   * before the Svelte compiler processes the components.
   */
  preprocess: vitePreprocess(),
};

export default config;
