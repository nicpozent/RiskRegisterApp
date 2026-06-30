import { defineConfig } from 'vitest/config';

// Unit suite: fast, no I/O. Runs on every commit and in CI.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
