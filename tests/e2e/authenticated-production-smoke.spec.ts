import { expect, test } from '@playwright/test';
// @ts-expect-error TypeScript does not infer declarations for the local .mjs helper in this test setup.
import { createAuthenticatedSmokeAdminClient, resolveAuthenticatedSmokeRecipient } from './authenticated-smoke-account.mjs';

const homePath = '/dashboard';
const homeHeading = '오늘 바로 움직일 것들';
const protectedPath = '/notifications';
const protectedHeading = '알림 정리함';
let smokeRecipientPromise: Promise<{ profileId: string; organizationId: string | null; email: string }> | null = null;

function createAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Authenticated smoke notification seeding requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  return createAuthenticatedSmokeAdminClient();
}

async function getSmokeRecipient() {
  const recipientPromise = smokeRecipientPromise ??= resolveAuthenticatedSmokeRecipient();
  return recipientPromise;
}

async function seedNotification(label: string) {
  const admin = createAdminClient();
  const recipient = await getSmokeRecipient();
  const title = `E2E smoke ${label} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await admin
    .from('notifications')
    .insert({
      recipient_profile_id: recipient.profileId,
      organization_id: recipient.organizationId,
      kind: 'generic',
      title,
      body: `Seeded by Playwright for ${label}.`
    })
    .select('id, title')
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to seed notification for authenticated smoke.');
  }

  return data;
}

async function deleteNotification(notificationId: string) {
  const admin = createAdminClient();
  const { error } = await admin.from('notifications').delete().eq('id', notificationId);

  if (error) {
    throw error;
  }
}

function notificationCardByTitle(page: Parameters<typeof test>[0] extends never ? never : any, title: string, buttonLabel: string) {
  return page.locator(
    `xpath=//p[normalize-space()='${title}']/ancestor::div[contains(@class,'rounded-[1.5rem]')][1][.//button[normalize-space()='${buttonLabel}']]`
  );
}

test('seeded session renders the authenticated marketing landing', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('button', { name: /로그아웃/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /확인할 알림 \d+개/i })).toHaveAttribute('href', '/notifications');
  await expect(page.getByRole('link', { name: /확인할 건 \d+개/i })).toHaveAttribute('href', '/cases');
});

test('seeded session skips the public login screen', async ({ page }) => {
  await page.goto('/login');

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: homeHeading })).toBeVisible();
});

test('seeded session loads the authenticated home screen', async ({ page }) => {
  await page.goto(homePath);

  await expect(page.getByRole('heading', { name: homeHeading })).toBeVisible();
  await expect(page.getByRole('button', { name: /로그아웃/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /알림 센터/i })).toBeVisible();
});

test('seeded session loads the configured protected route', async ({ page }) => {
  await page.goto(protectedPath);

  await expect(page.getByRole('heading', { name: protectedHeading }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /로그아웃/i })).toBeVisible();
});

test('notification center exposes summary cards and size filters', async ({ page }) => {
  await page.goto('/notifications?size=5');

  await expect(page.getByRole('heading', { name: protectedHeading }).first()).toBeVisible();
  await expect(page.getByText('읽지 않음').first()).toBeVisible();
  await expect(page.getByText('처리 필요').first()).toBeVisible();
  await expect(page.getByText('보관함').first()).toBeVisible();
  await expect(page.getByRole('navigation', { name: '알림 개수 선택' }).getByRole('link', { name: '5개' })).toHaveAttribute('aria-current', 'page');
});

test('notification center shows its major sections', async ({ page }) => {
  await page.goto('/notifications');

  await expect(page.getByRole('heading', { name: '조치 필요' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '참고용' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '최근 도착' })).toBeVisible();
});

test('notification center can mark a seeded item as read', async ({ page }) => {
  const notification = await seedNotification('mark-read');

  try {
    await page.goto('/notifications');

    const card = notificationCardByTitle(page, notification.title, '확인');
    await expect(card).toBeVisible();
    await expect(card.getByText('읽지 않음')).toBeVisible();

    await card.getByRole('button', { name: '확인' }).click();

    await expect(card.getByText('읽지 않음')).toHaveCount(0);
  } finally {
    await deleteNotification(notification.id);
  }
});

test('notification center can mark all seeded unread items as read', async ({ page }) => {
  const firstNotification = await seedNotification('mark-all-read-a');
  const secondNotification = await seedNotification('mark-all-read-b');

  try {
    await page.goto('/notifications');

    await expect(notificationCardByTitle(page, firstNotification.title, '확인')).toBeVisible();
    await expect(notificationCardByTitle(page, secondNotification.title, '확인')).toBeVisible();

    await page.getByRole('button', { name: '읽지 않은 알림만 정리' }).click();

    await expect(notificationCardByTitle(page, firstNotification.title, '확인')).toHaveCount(0);
    await expect(notificationCardByTitle(page, secondNotification.title, '확인')).toHaveCount(0);
  } finally {
    await deleteNotification(firstNotification.id);
    await deleteNotification(secondNotification.id);
  }
});

test('seeded session can open the case board', async ({ page }) => {
  await page.goto('/cases');

  await expect(page.getByRole('heading', { name: '사건 흐름과 최근 움직임을 한 화면에서 관리합니다.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '사건 운영' })).toBeVisible();
  await expect(page.getByText('현재 사건 수')).toBeVisible();
});

test('seeded session can open the inbox hub', async ({ page }) => {
  await page.goto('/inbox');

  await expect(page.getByRole('heading', { name: '메시지, 요청, 결재, 알림을 하나의 흐름으로 정리합니다.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '미처리 요청' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '최근 대화' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '결재 대기' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '미확인 알림' })).toBeVisible();
});

test('seeded session can open the document workflow board', async ({ page }) => {
  await page.goto('/documents');

  await expect(page.getByRole('heading', { name: '문서 흐름' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '문서 목록' }).first()).toBeVisible();
  await expect(page.getByText('사건별 문서 상태와 최근 변경 흐름을 한곳에서 확인합니다.')).toBeVisible();
});

test('seeded session can open the calendar board for a requested month', async ({ page }) => {
  await page.goto('/calendar?month=2026-03');

  await expect(page.getByRole('heading', { name: '개인 일정과 조직 일정을 한 화면에서 확인합니다.' })).toBeVisible();
  await expect(page.getByText('2026-03')).toBeVisible();
  await expect(page.getByRole('link', { name: /이전 달/i })).toHaveAttribute('href', '/calendar?month=2026-02');
  await expect(page.getByRole('link', { name: /다음 달/i })).toHaveAttribute('href', '/calendar?month=2026-04');
});

test('seeded session can open the client workspace', async ({ page }) => {
  await page.goto('/clients');

  await expect(page.getByRole('heading', { name: '의뢰인 관리' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '의뢰인 목록' })).toBeVisible();
});

test('seeded session can open organization request history', async ({ page }) => {
  await page.goto('/organization-request');

  await expect(page.getByRole('heading', { name: '조직 개설 신청', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '조직 개설 신청서', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '나의 신청 내역' })).toBeVisible();
});

test('seeded session can open client access search', async ({ page }) => {
  await page.goto('/client-access');

  await expect(page.getByRole('heading', { name: '조직 검색부터 연결 요청까지 한 번에 이어집니다.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '조직 검색', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '검색하기' })).toBeVisible();
});

test('seeded session can open settings overview', async ({ page }) => {
  await page.goto('/settings');

  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('link', { name: '개요' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '운영 원칙' })).toBeVisible();
});

test('seeded session can open the organizations workspace and navigate to detail', async ({ page }) => {
  await page.goto('/organizations');

  await expect(page.getByRole('heading', { name: 'Organizations' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '접근 가능한 조직' })).toBeVisible();

  const organizationLinks = page.locator('a[href^="/organizations/"]');
  if (await organizationLinks.count()) {
    await organizationLinks.first().click();

    await expect(page.getByRole('heading', { name: '조직 정보' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '구성원' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '최근 사건' })).toBeVisible();
  } else {
    await expect(page.getByText('접근 가능한 조직이 없습니다.')).toBeVisible();
  }
});

test('seeded session can open the reports dashboard', async ({ page }) => {
  await page.goto('/reports');

  await expect(page.getByRole('heading', { name: '성과 리포트' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '핵심 수치 요약' })).toBeVisible();
  await expect(page.getByRole('link', { name: '엑셀 내보내기' })).toHaveAttribute('href', /\/api\/exports\/reports\?format=xlsx$/);
  await expect(page.getByRole('link', { name: 'PDF 내보내기' })).toHaveAttribute('href', /\/api\/exports\/reports\?format=pdf$/);
  await expect(page.getByRole('link', { name: '워드 내보내기' })).toHaveAttribute('href', /\/api\/exports\/reports\?format=docx$/);
});

test('seeded session can open team settings', async ({ page }) => {
  await page.goto('/settings/team');

  await expect(page.getByRole('heading', { name: 'Team & Permissions' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '구성원 권한' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '초대 내역' })).toBeVisible();
});