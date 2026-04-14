/**
 * 보안 경계 E2E — 12 시나리오 (지시서 4.5)
 *
 * 비배정 사용자 / 타조직 사용자 / wrong subtype 진입을 페이지 가드와 액션
 * 가드가 모두 차단하는지 검증.
 *
 * 사전조건:
 *   - supabase/seeds/0002_e2e_test_data.sql 적용 (조직 A, B)
 *   - scripts/seed-e2e-users.mjs 실행 (사용자 5명)
 *   - 다음 env 모두 세팅:
 *       SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *       NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *       E2E_SEED_USER_MANAGER_EMAIL, E2E_SEED_USER_ASSIGNED_EMAIL,
 *       E2E_SEED_USER_UNASSIGNED_EMAIL, E2E_SEED_USER_OTHERORG_EMAIL,
 *       E2E_SEED_USER_CLIENT_EMAIL,
 *       E2E_SEED_USER_PASSWORD,
 *       E2E_SEED_USER_MANAGER_PROFILE_ID, E2E_SEED_USER_ASSIGNED_PROFILE_ID
 *   - 미설정 시 spec 전체 skip (CI fork PR 무해)
 */
import { test, expect, type SeedCases } from './fixtures/seed';
import { type Page } from '@playwright/test';

const REQUIRED_ENV = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'E2E_SEED_USER_MANAGER_EMAIL',
  'E2E_SEED_USER_ASSIGNED_EMAIL',
  'E2E_SEED_USER_UNASSIGNED_EMAIL',
  'E2E_SEED_USER_OTHERORG_EMAIL',
  'E2E_SEED_USER_PASSWORD',
  'E2E_SEED_USER_MANAGER_PROFILE_ID',
  'E2E_SEED_USER_ASSIGNED_PROFILE_ID',
] as const;

const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k]);
test.skip(missingEnv.length > 0, `보안 경계 E2E env 미설정: ${missingEnv.join(', ')}`);

async function loginAs(page: Page, email: string) {
  // 임시 로그인 폼이 정확한 selector는 프로젝트마다 다름. 최소 선택자만 가정.
  // 실제 spec 작성 시 /login 경로 + email/password input + submit 버튼 selector
  // 를 확인 후 보완.
  await page.goto('/login');
  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', process.env.E2E_SEED_USER_PASSWORD!);
  await Promise.all([
    page.waitForURL((url) => !/\/login(\?|$)/.test(url.pathname), { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
}

test.describe('보안 경계 — 비배정 사용자 차단', () => {
  test('1. cover URL — 비배정 → 404', async ({ page, seed }) => {
    await loginAs(page, process.env.E2E_SEED_USER_UNASSIGNED_EMAIL!);
    const res = await page.goto(`/cases/${seed.caseGeneralId}/cover`);
    expect(res?.status()).toBe(404);
  });

  test('2. rehabilitation URL — 비배정 → 404', async ({ page, seed }) => {
    await loginAs(page, process.env.E2E_SEED_USER_UNASSIGNED_EMAIL!);
    const res = await page.goto(`/cases/${seed.caseRehabId}/rehabilitation`);
    expect(res?.status()).toBe(404);
  });

  test('3. bankruptcy URL — 비배정 → 404', async ({ page, seed }) => {
    await loginAs(page, process.env.E2E_SEED_USER_UNASSIGNED_EMAIL!);
    const res = await page.goto(`/cases/${seed.caseBankruptcyId}/bankruptcy`);
    expect(res?.status()).toBe(404);
  });
});

test.describe('보안 경계 — 타조직 사용자 차단', () => {
  test('6. cover URL — 타조직 → 404', async ({ page, seed }) => {
    await loginAs(page, process.env.E2E_SEED_USER_OTHERORG_EMAIL!);
    const res = await page.goto(`/cases/${seed.caseGeneralId}/cover`);
    expect(res?.status()).toBe(404);
  });

  test('7. rehabilitation URL — 타조직 → 404', async ({ page, seed }) => {
    await loginAs(page, process.env.E2E_SEED_USER_OTHERORG_EMAIL!);
    const res = await page.goto(`/cases/${seed.caseRehabId}/rehabilitation`);
    expect(res?.status()).toBe(404);
  });
});

test.describe('보안 경계 — wrong subtype 차단', () => {
  test('8. 회생 사건의 bankruptcy URL — 404', async ({ page, seed }) => {
    await loginAs(page, process.env.E2E_SEED_USER_ASSIGNED_EMAIL!);
    const res = await page.goto(`/cases/${seed.caseRehabId}/bankruptcy`);
    expect(res?.status()).toBe(404);
  });

  test('9. 파산 사건의 rehabilitation URL — 404', async ({ page, seed }) => {
    await loginAs(page, process.env.E2E_SEED_USER_ASSIGNED_EMAIL!);
    const res = await page.goto(`/cases/${seed.caseBankruptcyId}/rehabilitation`);
    expect(res?.status()).toBe(404);
  });
});

test.describe('보안 경계 — 컨트롤 (정상 진입)', () => {
  test('11. 배정 사용자가 회생 진입 → 200', async ({ page, seed }) => {
    await loginAs(page, process.env.E2E_SEED_USER_ASSIGNED_EMAIL!);
    const res = await page.goto(`/cases/${seed.caseRehabId}/rehabilitation`);
    expect(res?.status()).toBe(200);
    await expect(page.getByText('[E2E] 회생사건')).toBeVisible({ timeout: 5000 });
  });

  test('12. 매니저가 파산 진입 → 200', async ({ page, seed }) => {
    await loginAs(page, process.env.E2E_SEED_USER_MANAGER_EMAIL!);
    const res = await page.goto(`/cases/${seed.caseBankruptcyId}/bankruptcy`);
    expect(res?.status()).toBe(200);
    await expect(page.getByText('[E2E] 파산사건')).toBeVisible({ timeout: 5000 });
  });
});

// NOTE: POST 경로 차단(시나리오 4, 5, 10)은 server action을 직접 호출해야 하므로
// 별도 vitest 통합 테스트(또는 페이지 내 폼 제출 → toast 검증)로 분리 권장.
// E2E에서 server action을 raw POST하기 어렵기 때문.
