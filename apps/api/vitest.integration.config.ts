import { defineConfig } from 'vitest/config';

// Integration suite: requires a real PostgreSQL (DATABASE_URL). Booted by
// scripts/test/integration.sh; tests self-skip if DATABASE_URL is unset.
export default defineConfig({
  test: {
    include: ['test/integration/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    fileParallelism: false, // share one DB; avoid cross-file races
  },
});
