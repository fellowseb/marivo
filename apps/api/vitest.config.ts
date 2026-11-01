import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.integration.test.ts'],
    environment: 'node',
    alias: {
      '@marivo/utils': new URL('../../packages/utils/src/index.ts', import.meta.url).pathname,
    },
  },
});
