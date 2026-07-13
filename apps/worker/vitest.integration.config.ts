import { defineConfig } from 'vitest/config';

// Integration suite: requires a real PostgreSQL (DATABASE_URL). Tests self-skip
// when it is unset. MS Graph is mocked, so no Graph credentials are needed.
export default defineConfig({
  test: {
    include: ['test/integration/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
