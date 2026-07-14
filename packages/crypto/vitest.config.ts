import { defineConfig } from 'vitest/config';

// Unit suite for the encryption seam: fast, no I/O (local AES + HMAC).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
