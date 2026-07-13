import { defineConfig, devices } from '@playwright/test';

// Dummy public config so MSAL constructs and the app renders in a real browser.
// (The authenticated flow needs a live Entra tenant, so e2e covers the
// unauthenticated shell; component/interaction behaviour is covered by RTL.)
const VITE_ENV = {
  VITE_ENTRA_TENANT_ID: 'test-tenant',
  VITE_ENTRA_SPA_CLIENT_ID: 'test-client-id',
  VITE_API_SCOPE: 'api://test/.default',
};

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4173', trace: 'on-first-retry' },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use a pre-provisioned browser when PW_CHROMIUM_PATH is set (avoids a
        // download); otherwise Playwright uses the browser it installed.
        ...(process.env.PW_CHROMIUM_PATH
          ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } }
          : {}),
      },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: VITE_ENV,
  },
});
