import dts from 'vite-plugin-dts';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    build: {
      copyPublicDir: false,
      lib: {
        entry: 'src/index.ts',
        name: 'HawkCore',
        fileName: 'hawk-core',
      },
    },

    plugins: [
      dts({
        tsconfigPath: './tsconfig.json',
      }),
    ],
  };
});
