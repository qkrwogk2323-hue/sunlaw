import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'authenticated-production-smoke.spec.ts',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './tests/e2e/authenticated.global-setup.mjs',
  use: {
    baseURL: 'http://127.0.0.1:3102',
    trace: 'on-first-retry',
    storageState: 'playwright/.auth/authenticated-smoke.json'
  },
  webServer: {
    command: 'pnpm exec next start --hostname 127.0.0.1 --port 3102',
    url: 'http://127.0.0.1:3102',
    reuseExistingServer: false,
    timeout: 120000
  },
  projects: [
    {
      name: 'chromium-authenticated-smoke',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});