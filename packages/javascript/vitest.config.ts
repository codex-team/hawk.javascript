import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
  define: {
    VERSION: JSON.stringify('0.0.0-test'),
  },
  resolve: {
    alias: {
      '@/types': path.resolve(__dirname, './src/types'),
    },
    conditions: ['source'],
  },
});
