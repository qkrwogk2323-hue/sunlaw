import { defineConfig, devices } from '@playwright/test';

/**
 * 보안 경계 E2E — 비배정/타조직/wrong subtype 진입 시나리오 9건.
 * fixtures/seed.ts가 테스트 사건 3종(general/rehab/bankruptcy)을
 * SERVICE_ROLE_KEY로 seed한 뒤 teardown까지 책임진다.
 *
 * 필요 env:
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   E2E_SEED_USER_MANAGER_EMAIL, E2E_SEED_USER_ASSIGNED_EMAIL,
 *   E2E_SEED_USER_UNASSIGNED_EMAIL, E2E_SEED_USER_OTHERORG_EMAIL,
 *   E2E_SEED_USER_CLIENT_EMAIL, E2E_SEED_USER_PASSWORD,
 *   E2E_SEED_USER_MANAGER_PROFILE_ID, E2E_SEED_USER_ASSIGNED_PROFILE_ID
 *
 * 해당 env가 없으면 spec 내부에서 test.skip으로 전체 스킵되므로 fork PR 무해.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'security-boundary.spec.ts',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3103',
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'pnpm exec next start --hostname 127.0.0.1 --port 3103',
    url: 'http://127.0.0.1:3103',
    reuseExistingServer: false,
    timeout: 120000
  },
  projects: [
    {
      name: 'chromium-security-boundary',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
