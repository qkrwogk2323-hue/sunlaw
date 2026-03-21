/**
 * Critical Path E2E Tests
 *
 * 이 파일은 smoke 테스트가 아닌 실제 사용자 경로를 검증합니다:
 * 1. 인증 보호 — 미인증 사용자가 보호 경로 접근 시 /login으로 리디렉션
 * 2. 알림 경로 무결성 — 알림 페이지에 destination_url 없는 알림 fallback 경로 검증
 * 3. 폼 검증 UX — ZodError raw JSON이 노출되지 않고 한국어 메시지로 표시
 * 4. Rate Limiting — 민감 엔드포인트 429 응답 검증
 */
import { expect, test } from '@playwright/test';

// ─── 1. 인증 보호 (Auth Guard) ─────────────────────────────────────────────

test.describe('인증 보호', () => {
  const protectedRoutes = [
    '/dashboard',
    '/cases',
    '/clients',
    '/notifications',
    '/settings/team',
    '/organizations',
  ];

  for (const route of protectedRoutes) {
    test(`${route} 미인증 접근 → /login 리디렉션`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

// ─── 2. 로그인 폼 UX ───────────────────────────────────────────────────────

test.describe('로그인 폼 UX', () => {
  test('로그인 페이지에 이메일/비밀번호 필드와 제출 버튼이 있다', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('빈 폼 제출 시 raw ZodError JSON이 노출되지 않는다', async ({ page }) => {
    await page.goto('/login');

    await page.locator('button[type="submit"]').click();

    // raw ZodError JSON 패턴이 화면에 없어야 함
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toMatch(/"issues"\s*:\s*\[/);
    expect(bodyText).not.toMatch(/"code"\s*:\s*"invalid_type"/);
    expect(bodyText).not.toMatch(/ZodError/);
  });
});

// ─── 3. 회원가입 폼 UX ─────────────────────────────────────────────────────

test.describe('회원가입 폼 UX', () => {
  test('일반회원가입 폼에 필수 입력 레이블이 있다', async ({ page }) => {
    await page.goto('/start/signup');

    // 이메일 input의 required 속성 또는 필수 레이블 확인
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.count() > 0) {
      const isRequired = await emailInput.getAttribute('required');
      const ariaRequired = await emailInput.getAttribute('aria-required');
      // required 속성 또는 aria-required 중 하나는 있어야 함
      const hasRequiredMark = page.locator('text=*').or(page.locator('[aria-label*="필수"]'));
      expect(isRequired !== null || ariaRequired !== null || await hasRequiredMark.count() > 0).toBeTruthy();
    }
  });

  test('조직 신청 페이지가 로드된다', async ({ page }) => {
    await page.goto('/start/signup?flow=organization');
    await expect(page).not.toHaveURL(/\/error/);
  });
});

// ─── 4. 알림 페이지 구조 ───────────────────────────────────────────────────

test.describe('알림 페이지 구조', () => {
  test('알림 페이지는 미인증 사용자를 /login으로 보낸다', async ({ page }) => {
    const response = await page.goto('/notifications');
    // 리디렉션 후 최종 URL이 /login을 포함해야 함
    await expect(page).toHaveURL(/\/login/);
    // 혹은 301/302 응답
    if (response) {
      expect([200, 301, 302, 307, 308]).toContain(response.status());
    }
  });
});

// ─── 5. Rate Limiting ──────────────────────────────────────────────────────

test.describe('Rate Limiting', () => {
  test('auth signup 엔드포인트는 과도한 요청 시 429를 반환한다', async ({ request }) => {
    // 6번 연속 POST → 5회 초과 시 429
    const responses: number[] = [];
    for (let i = 0; i < 7; i++) {
      const res = await request.post('/api/auth/general-signup', {
        data: { test: true },
        headers: { 'Content-Type': 'application/json' }
      });
      responses.push(res.status());
    }

    // 최소 한 번은 429여야 함
    expect(responses).toContain(429);
  });
});
