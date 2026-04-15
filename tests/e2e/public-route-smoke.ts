import { expect, test } from '@playwright/test';

export function registerPublicRouteSmokeTests() {
  test('marketing page routes public users into the start flow', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: '시작하기' })).toHaveAttribute('href', '/start');
    await expect(page.getByRole('heading', { name: '필요한 전문가들이 한 사건에 모이고, 의뢰인과의 소통까지 하나로 이어집니다.' })).toBeVisible();
  });

  test('start page renders core entry actions', async ({ page }) => {
    await page.goto('/start');

    await expect(page.getByRole('heading', { name: '로그인과 회원가입부터 시작하고, 그다음 경로를 정확하게 나눕니다.' })).toBeVisible();
    await expect(page.getByRole('link', { name: /로그인하기/i })).toHaveAttribute('href', '/login');
    await expect(page.getByRole('link', { name: /회원가입하기/i })).toHaveAttribute('href', '/start/signup');
    await expect(page.getByRole('link', { name: /조직 연결 요청/i })).toHaveCount(0);
  });

  test('start page links into the signup guide', async ({ page }) => {
    await page.goto('/start');
    await page.locator('a[href="/start/signup"]').click();

    await expect(page).toHaveURL(/\/start\/signup$/);
    await expect(page.getByRole('heading', { name: '1단계. 가입 방식을 선택하세요' })).toBeVisible();
  });

  test('signup guide asks anonymous users to sign up first', async ({ page }) => {
    await page.goto('/start/signup');

    await expect(page.getByRole('heading', { name: '회원가입 후 필요한 가입 경로를 이어서 선택하세요.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '1단계. 가입 방식을 선택하세요' })).toBeVisible();
    await expect(page.getByRole('button', { name: '카카오로 시작하기' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '일반회원가입' })).toBeVisible();
  });

  test('signup guide defers organization flow until after signup', async ({ page }) => {
    await page.goto('/start/signup?flow=organization');

    await expect(page.getByRole('heading', { name: '1단계. 가입 방식을 선택하세요' })).toBeVisible();
    await expect(page.getByRole('button', { name: '카카오로 시작하기' })).toBeVisible();
  });

  test('signup guide renders the client flow login step', async ({ page }) => {
    await page.goto('/start/signup?flow=client');

    await expect(page.getByRole('heading', { name: '1단계. 가입 방식을 선택하세요' })).toBeVisible();
    await expect(page.getByRole('button', { name: '카카오로 시작하기' })).toBeVisible();
  });

  test('signup guide renders the connection flow details', async ({ page }) => {
    await page.goto('/start/signup?flow=connection');

    await expect(page.getByRole('heading', { name: '1단계. 가입 방식을 선택하세요' })).toBeVisible();
    await expect(page.getByRole('button', { name: '카카오로 시작하기' })).toBeVisible();
  });

  test('login page exposes the signup guide entry', async ({ page }) => {
    await page.goto('/login');

    // 로그인 페이지의 메인 heading은 "로그인" (CardTitle). 이전 디자인의 "로그인 방법 선택"은 제거됨.
    await expect(page.getByRole('heading', { name: '로그인', exact: true })).toBeVisible();
    // 회원가입 진입점은 "일반 회원가입" 링크로 렌더됨 (NAVIGATION_MAP.loginSignup).
    await expect(page.getByRole('link', { name: '일반 회원가입' })).toBeVisible();
  });

  test('organization request page asks anonymous users to sign in', async ({ page }) => {
    await page.goto('/organization-request');

    await expect(page.getByRole('heading', { name: '조직 개설 신청' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '로그인이 필요합니다.' })).toBeVisible();
  });

  test('client access page renders public search before login', async ({ page }) => {
    await page.goto('/client-access');

    await expect(page.getByRole('heading', { name: '초대번호가 있으면 바로 입력하고, 없으면 조직가입신청으로 이어집니다.' })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: '' })).toHaveAttribute('placeholder', '조직명 또는 조직 키를 입력해 주세요');
    await expect(page.getByRole('button', { name: '검색하기' })).toBeVisible();
  });

  test('anonymous users are redirected to login for protected routes', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login$/);
    // 로그인 페이지의 메인 heading은 "로그인" (CardTitle). 이전 디자인의 "로그인 방법 선택"은 제거됨.
    await expect(page.getByRole('heading', { name: '로그인', exact: true })).toBeVisible();
  });

  test('anonymous users are redirected to login before invitation acceptance', async ({ page }) => {
    await page.goto('/invite/test-token');

    await expect(page).toHaveURL(/\/login$/);
    // 로그인 페이지의 메인 heading은 "로그인" (CardTitle). 이전 디자인의 "로그인 방법 선택"은 제거됨.
    await expect(page.getByRole('heading', { name: '로그인', exact: true })).toBeVisible();
  });

  test('auth callback preserves the requested next path without a code', async ({ page }) => {
    await page.goto('/auth/callback?next=/start/signup?flow=connection');

    await expect(page).toHaveURL(/\/start\/signup\?flow=connection$/);
    await expect(page.getByRole('heading', { name: '1단계. 가입 방식을 선택하세요' })).toBeVisible();
  });

  test('oauth code landing on the homepage is rerouted through auth callback handling', async ({ page }) => {
    await page.goto('/?code=test-oauth-code');

    await expect(page).toHaveURL(/\/login\?error=/);
    // 로그인 페이지의 메인 heading은 "로그인" (CardTitle). 이전 디자인의 "로그인 방법 선택"은 제거됨.
    await expect(page.getByRole('heading', { name: '로그인', exact: true })).toBeVisible();
  });

  test('unknown routes show the not found experience', async ({ page }) => {
    await page.goto('/definitely-missing-route');

    await expect(page.getByRole('heading', { name: '페이지를 찾을 수 없습니다.' })).toBeVisible();
    await expect(page.getByRole('link', { name: '대시보드로 이동' })).toHaveAttribute('href', '/dashboard');
  });

  test('health endpoint reports service status', async ({ request }) => {
    // /api/health는 SUPABASE_SERVICE_ROLE_KEY로 admin client를 만들어 DB 1-row 조회로
    // 상태를 확인한다. service_role이 없으면(예: fork PR, secret 미설정 CI) 503을
    // 돌려주므로 해당 환경에서는 테스트 skip.
    const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    test.skip(!hasServiceRole, 'SUPABASE_SERVICE_ROLE_KEY 미설정 — health endpoint 검증 skip');

    const response = await request.get('/api/health');

    expect(response.ok()).toBe(true);
    await expect(response.json()).resolves.toEqual({ ok: true, service: 'vein-spiral-v2' });
  });
}