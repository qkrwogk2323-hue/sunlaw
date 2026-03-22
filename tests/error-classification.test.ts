import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeGuardFeedback } from '@/lib/guard-feedback';

const mocks = vi.hoisted(() => ({
  requirePlatformAdminAction: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  createSupabaseAdminClient: vi.fn()
}));

vi.mock('@/lib/auth', () => ({
  requirePlatformAdminAction: mocks.requirePlatformAdminAction,
  requireAuthenticatedUser: mocks.requireAuthenticatedUser
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient
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

describe('error classification guards', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requirePlatformAdminAction.mockResolvedValue(auth);
    mocks.requireAuthenticatedUser.mockResolvedValue(auth);
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
});
