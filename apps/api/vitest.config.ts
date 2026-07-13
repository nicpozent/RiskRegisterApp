import { defineConfig } from 'vitest/config';

// Unit suite: fast, no I/O. Runs on every commit and in CI.
// Coverage is scoped to the pure logic the unit suite is responsible for
// (domain rules, request validation, RBAC). The service/repository/HTTP layers
// are exercised by the integration suite (real Postgres) instead, so including
// them here would measure them as uncovered and be misleading.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/domain/**',
        'src/interface/middleware/rbac.ts',
        'src/interface/routes/risk.schemas.ts',
      ],
      // control.ts is a type-only module (no executable code to cover); test
      // files themselves shouldn't count toward coverage.
      exclude: ['src/domain/control.ts', '**/*.test.ts'],
      reporter: ['text', 'html'],
      thresholds: { statements: 90, branches: 85, functions: 90, lines: 90 },
    },
  },
});
