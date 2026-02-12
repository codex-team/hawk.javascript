import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
    },
  },
});
