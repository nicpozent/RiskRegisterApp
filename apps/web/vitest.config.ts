import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Component/interaction tests run in jsdom via React Testing Library.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
