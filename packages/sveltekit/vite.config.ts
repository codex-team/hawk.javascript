import path from 'path';
import dts from 'vite-plugin-dts';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    build: {
      lib: {
        entry: path.resolve(__dirname, 'src', 'index.ts'),
        name: 'Hawk',
        fileName: 'hawk-sveltekit',
      },
      rollupOptions: {
        external: ['sveltekit', '@hawk.so/javascript'],
      },
    },
    plugins: [
      dts({
        tsconfigPath: './tsconfig.json',
      }),
    ],
  };
});
