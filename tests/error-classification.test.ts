import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeGuardFeedback } from '@/lib/guard-feedback';

const mocks = vi.hoisted(() => ({
  requirePlatformAdminAction: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
  hasActivePlatformAdminView: vi.fn(() => false),
  getPlatformOrganizationContextId: vi.fn(() => 'platform-org-1'),
  createSupabaseServerClient: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  notifyPlatformBugAlert: vi.fn()
}));

vi.mock('@/lib/auth', () => ({
  requirePlatformAdminAction: mocks.requirePlatformAdminAction,
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
  hasActivePlatformAdminView: mocks.hasActivePlatformAdminView,
  getPlatformOrganizationContextId: mocks.getPlatformOrganizationContextId
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient
}));

vi.mock('@/lib/platform-alerts', () => ({
  notifyPlatformBugAlert: mocks.notifyPlatformBugAlert
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn()
}));

vi.mock('server-only', () => ({}));

const auth = {
  user: { id: 'user-1', email: 'manager@example.com' },
  profile: { id: 'user-1', full_name: '관리자', default_organization_id: 'org-1' },
  memberships: [{ organization_id: 'org-1', status: 'active' }]
};

function makeNotificationClient(notification: Record<string, unknown>) {
  const single = vi.fn().mockResolvedValue({ data: notification, error: null });
  const eq2 = vi.fn(() => ({ single }));
  const eq1 = vi.fn(() => ({ eq: eq2 }));
  const select = vi.fn(() => ({ eq: eq1 }));
  const from = vi.fn(() => ({ select }));
  return { client: { from }, from };
}

describe('error classification guards', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requirePlatformAdminAction.mockResolvedValue(auth);
    mocks.requireAuthenticatedUser.mockResolvedValue(auth);
    mocks.hasActivePlatformAdminView.mockResolvedValue(false);
    mocks.notifyPlatformBugAlert.mockResolvedValue(undefined);
  });

  it('classifies invalid support session requests with a concrete code', async () => {
    const { beginSupportSessionAction } = await import('@/lib/actions/support-actions');

    let thrown: unknown;
    try {
      await beginSupportSessionAction(new FormData());
    } catch (error) {
      thrown = error;
    }

    const feedback = normalizeGuardFeedback(thrown);
    expect(feedback.code).toBe('SUPPORT_SESSION_REQUEST_ID_MISSING');
    expect(feedback.blocked).toContain('지원 세션');
    expect(feedback.resolution).toContain('지원 요청 목록');
  });

  it('classifies notification opens without id', async () => {
    const { resolveNotificationOpenTarget } = await import('@/lib/notification-open');

    let thrown: unknown;
    try {
      await resolveNotificationOpenTarget({ notificationId: '' });
    } catch (error) {
      thrown = error;
    }

    const feedback = normalizeGuardFeedback(thrown);
    expect(feedback.code).toBe('NOTIFICATION_ID_MISSING');
    expect(feedback.blocked).toContain('알림');
    expect(feedback.resolution).toContain('알림 목록');
  });

  it('blocks platform-only notification destinations for non-platform users', async () => {
    // Mock DB to return a notification with /admin path destination
    const { client } = makeNotificationClient({
      id: 'notif-1',
      recipient_profile_id: 'user-1',
      organization_id: 'org-1',
      read_at: null,
      status: 'active',
      destination_url: '/admin/audit',
      action_href: null,
      notification_type: 'platform_bug_alert'
    });
    mocks.createSupabaseServerClient.mockResolvedValue(client);
    mocks.hasActivePlatformAdminView.mockResolvedValue(false);

    const { resolveNotificationOpenTarget } = await import('@/lib/notification-open');

    let thrown: unknown;
    try {
      await resolveNotificationOpenTarget({ notificationId: 'notif-1' });
    } catch (error) {
      thrown = error;
    }

    const feedback = normalizeGuardFeedback(thrown);
    expect(feedback.code).toBe('PLATFORM_NOTIFICATION_LEAK');
    expect(feedback.blocked).toContain('플랫폼 전용');
    // Bug alert should have been triggered
    expect(mocks.notifyPlatformBugAlert).toHaveBeenCalled();
  });

  it('blocks cross-organization notification targets (no membership)', async () => {
    const { client } = makeNotificationClient({
      id: 'notif-2',
      recipient_profile_id: 'user-1',
      organization_id: 'org-1',
      read_at: null,
      status: 'active',
      destination_url: '/cases/some-case',
      action_href: null,
      notification_type: 'case_created'
    });
    mocks.createSupabaseServerClient.mockResolvedValue(client);
    mocks.hasActivePlatformAdminView.mockResolvedValue(false);

    const { resolveNotificationOpenTarget } = await import('@/lib/notification-open');

    let thrown: unknown;
    try {
      // Request opening with a different org that user is NOT a member of
      await resolveNotificationOpenTarget({ notificationId: 'notif-2', nextOrganizationId: 'org-OTHER' });
    } catch (error) {
      thrown = error;
    }

    const feedback = normalizeGuardFeedback(thrown);
    expect(feedback.code).toBe('NOTIFICATION_TARGET_ORGANIZATION_FORBIDDEN');
    expect(feedback.blocked).toContain('조직');
  });
});
