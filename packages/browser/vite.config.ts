import path from 'path';
import dts from 'vite-plugin-dts';
import { defineConfig } from 'vite';

import license from 'rollup-plugin-license';

import * as pkg from './package.json';

const NODE_ENV = process.argv.mode || 'development';
const VERSION = pkg.version;

/**
 * Trick to use Vite server.open option on macOS
 *
 * @see https://github.com/facebook/create-react-app/pull/1690#issuecomment-283518768
 */
process.env.BROWSER = 'open';

export default defineConfig(() => {
  return {
    build: {
      copyPublicDir: false,
      lib: {
        entry: path.resolve(__dirname, 'src', 'index.ts'),
        name: 'HawkCatcher',
        fileName: 'hawk-browser',
      },
      rollupOptions: {
        plugins: [
          license({
            thirdParty: {
              allow: {
                test: (dependency) => {
                  // Return false for unlicensed dependencies.
                  if (!dependency.license) {
                    return false;
                  }

                  // Allow MIT, Apache-2.0, and AGPL-3.0-only (for @hawk.so/core) licenses.
                  return ['MIT', 'Apache-2.0', 'AGPL-3.0-only'].includes(dependency.license);
                },
                failOnUnlicensed: true,
                failOnViolation: true,
              },
              output: path.resolve(__dirname, 'dist', 'vendor.LICENSE.txt'),
            },
          }),
        ],
      },
    },

    define: {
      'NODE_ENV': JSON.stringify(NODE_ENV),
      'VERSION': JSON.stringify(VERSION),
    },

    resolve: {
      alias: {
        '@/types': path.resolve(__dirname, './src/types'),
      },
    },

    server: {
      port: 3303,
      open: './example/index.html',
    },

    plugins: [
      dts({
        tsconfigPath: './tsconfig.json',
      }),
    ],
  };
});
