import { expect, test } from '@playwright/test';

export function registerPublicRouteSmokeTests() {
  test('marketing page routes public users into the start flow', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: '시작하기' })).toHaveAttribute('href', '/start');
    await expect(page.getByRole('heading', { name: '필요한 전문가들이 한 사건에 모이고, 의뢰인과의 소통까지 하나로 이어집니다.' })).toBeVisible();
  });

  test('start page renders core entry actions', async ({ page }) => {
    await page.goto('/start');

    await expect(page.getByRole('heading', { name: '랜딩에서 다음 단계까지, 지금 해야 할 선택을 분명하게 안내합니다.' })).toBeVisible();
    await expect(page.getByRole('link', { name: /로그인하기/i })).toHaveAttribute('href', '/login');
    await expect(page.getByRole('link', { name: /조직 개설 시작/i })).toHaveAttribute('href', '/start/signup?flow=organization');
    await expect(page.getByRole('link', { name: /의뢰인 가입 시작/i })).toHaveAttribute('href', '/start/signup?flow=client');
  });

  test('start page links into the signup guide', async ({ page }) => {
    await page.goto('/start');
    await page.locator('a[href="/start/signup?flow=organization"]').click();

    await expect(page).toHaveURL(/\/start\/signup\?flow=organization$/);
    await expect(page.getByRole('heading', { name: '조직 개설 흐름' })).toBeVisible();
  });

  test('signup guide exposes both organization and client entry flows', async ({ page }) => {
    await page.goto('/start/signup');

    await expect(page.getByRole('heading', { name: '이용 방식과 다음 단계를 한 화면에서 확인하세요.' })).toBeVisible();
    await expect(page.getByRole('link', { name: /조직 개설 단계 보기/i })).toHaveAttribute('href', '/start/signup?flow=organization');
    await expect(page.getByRole('link', { name: /의뢰인 가입 단계 보기/i })).toHaveAttribute('href', '/start/signup?flow=client');
    await expect(page.getByRole('link', { name: /연결 요청 단계 보기/i })).toHaveAttribute('href', '/start/signup?flow=connection');
  });

  test('signup guide renders the organization flow details', async ({ page }) => {
    await page.goto('/start/signup?flow=organization');

    await expect(page.getByRole('heading', { name: '이용 방식과 다음 단계를 한 화면에서 확인하세요.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '조직 개설 흐름' })).toBeVisible();
    await expect(page.getByRole('link', { name: /조직 개설 신청으로 이동/i })).toHaveAttribute('href', '/organization-request');
  });

  test('signup guide renders the client flow login step', async ({ page }) => {
    await page.goto('/start/signup?flow=client');

    await expect(page.getByRole('heading', { name: '의뢰인 가입 흐름' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '1단계. 로그인으로 본인 확인 시작' })).toBeVisible();
    await expect(page.getByRole('button', { name: '카카오로 로그인' })).toBeVisible();
  });

  test('signup guide renders the connection flow details', async ({ page }) => {
    await page.goto('/start/signup?flow=connection');

    await expect(page.getByRole('heading', { name: '조직 연결 요청 흐름' })).toBeVisible();
    await expect(page.getByRole('link', { name: /조직 연결 요청으로 이동/i })).toHaveAttribute('href', '/client-access');
  });

  test('login page exposes the signup guide entry', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: '카카오로 로그인' })).toBeVisible();
    await expect(page.getByRole('link', { name: '회원가입 안내' })).toHaveAttribute('href', '/start/signup');
  });

  test('organization request page asks anonymous users to sign in', async ({ page }) => {
    await page.goto('/organization-request');

    await expect(page.getByRole('heading', { name: '조직 개설 신청' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '로그인이 필요합니다.' })).toBeVisible();
  });

  test('client access page renders public search before login', async ({ page }) => {
    await page.goto('/client-access');

    await expect(page.getByRole('heading', { name: '조직 검색부터 연결 요청까지 한 번에 이어집니다.' })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: '' })).toHaveAttribute('placeholder', '조직명 또는 조직 키를 입력해 주세요');
    await expect(page.getByRole('button', { name: '검색하기' })).toBeVisible();
  });

  test('anonymous users are redirected to login for protected routes', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: '카카오로 로그인' })).toBeVisible();
  });

  test('anonymous users are redirected to login before invitation acceptance', async ({ page }) => {
    await page.goto('/invite/test-token');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: '카카오로 로그인' })).toBeVisible();
  });

  test('auth callback preserves the requested next path without a code', async ({ page }) => {
    await page.goto('/auth/callback?next=/start/signup?flow=connection');

    await expect(page).toHaveURL(/\/start\/signup\?flow=connection$/);
    await expect(page.getByRole('heading', { name: '조직 연결 요청 흐름' })).toBeVisible();
  });

  test('unknown routes show the not found experience', async ({ page }) => {
    await page.goto('/definitely-missing-route');

    await expect(page.getByRole('heading', { name: '페이지를 찾을 수 없습니다.' })).toBeVisible();
    await expect(page.getByRole('link', { name: '대시보드로 이동' })).toHaveAttribute('href', '/dashboard');
  });

  test('health endpoint reports service status', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.ok()).toBe(true);
    await expect(response.json()).resolves.toEqual({ ok: true, service: 'vein-spiral-v2' });
  });
}