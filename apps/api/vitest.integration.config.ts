import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.ts'],
    environment: 'node',
    testTimeout: 60000,
    hookTimeout: 60000,
    pool: 'forks',
    alias: {
      '@marivo/utils': new URL('../../packages/utils/src/index.ts', import.meta.url).pathname,
    },
  },
});
