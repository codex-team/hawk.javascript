import path from 'path';
import dts from 'vite-plugin-dts';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    build: {
      lib: {
        entry: path.resolve(__dirname, 'src', 'index.ts'),
        name: 'HawkSvelte',
        fileName: 'hawk-svelte',
      },
      rollupOptions: {
        external: ['svelte', '@hawk.so/javascript'],
      },
    },
    plugins: [
      dts({
        tsconfigPath: './tsconfig.json',
      }),
    ],
  };
});
