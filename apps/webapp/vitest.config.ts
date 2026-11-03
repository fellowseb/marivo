import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'jsdom',
    alias: {
      // Resolve the workspace package from source so tests don't depend on
      // packages/utils/dist being built first
      '@marivo/utils': new URL('../../packages/utils/src/index.ts', import.meta.url).pathname,
    },
  },
});
