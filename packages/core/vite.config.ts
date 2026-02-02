import path from 'path';
import dts from 'vite-plugin-dts';
import { defineConfig } from 'vite';

import license from 'rollup-plugin-license';

import * as pkg from './package.json';

const NODE_ENV = process.argv.mode || 'development';
const VERSION = pkg.version;

export default defineConfig(() => {
  return {
    build: {
      copyPublicDir: false,
      lib: {
        entry: path.resolve(__dirname, 'src', 'index.ts'),
        name: 'HawkCore',
        fileName: 'hawk-core',
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

                  // Allow MIT and Apache-2.0 licenses.
                  return ['MIT', 'Apache-2.0'].includes(dependency.license);
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

    plugins: [
      dts({
        tsconfigPath: './tsconfig.json',
      }),
    ],
  };
});
