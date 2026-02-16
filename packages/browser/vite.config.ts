import dts from 'vite-plugin-dts';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    build: {
      copyPublicDir: false,
      lib: {
        entry: 'src/index.ts',
        name: 'HawkBrowser',
        fileName: 'hawk-browser',
      },
    },

    plugins: [
      dts({
        tsconfigPath: './tsconfig.json',
      }),
    ],
  };
});
