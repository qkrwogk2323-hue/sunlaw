import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((href: string) => {
    throw Object.assign(new Error(`NEXT_REDIRECT:${href}`), { digest: 'NEXT_REDIRECT', href });
  }),
  hasPlatformViewForOrganization: vi.fn(() => false),
  isPlatformOperator: vi.fn(() => false),
  getEffectiveOrganizationId: vi.fn(() => 'org-1'),
  readSupportSessionCookie: vi.fn(() => null),
  getOrganizationSubscriptionSnapshot: vi.fn(() => ({ status: 'active' })),
  enforceSubscriptionRouteAccess: vi.fn(),
  getSubscriptionLockMessage: vi.fn(() => null),
}));

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/lib/auth', () => ({
  getEffectiveOrganizationId: mocks.getEffectiveOrganizationId,
  hasPlatformViewForOrganization: mocks.hasPlatformViewForOrganization,
  isPlatformOperator: mocks.isPlatformOperator,
  isManagementRole: (role?: string | null) => role === 'org_owner' || role === 'org_manager',
}));
vi.mock('@/lib/support-cookie', () => ({ readSupportSessionCookie: mocks.readSupportSessionCookie }));
vi.mock('@/lib/subscription-lock', () => ({
  getOrganizationSubscriptionSnapshot: mocks.getOrganizationSubscriptionSnapshot,
  enforceSubscriptionRouteAccess: mocks.enforceSubscriptionRouteAccess,
  getSubscriptionLockMessage: mocks.getSubscriptionLockMessage,
}));

import { enforceAppEntryPolicy } from '@/lib/app-entry-policy';

function makeAuth(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'user-1', email: 'test@example.com' },
    profile: {
      id: 'profile-1',
      must_change_password: false,
      must_complete_profile: false,
      full_name: '홍길동',
      legal_name: null,
      legal_name_confirmed_at: null,
      client_account_status: null,
      ...overrides,
    },
    memberships: [{ organization_id: 'org-1', role: 'org_staff', status: 'active', permissions: [] }],
  } as any;
}

describe('enforceAppEntryPolicy — client account routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasPlatformViewForOrganization.mockReturnValue(false);
    mocks.isPlatformOperator.mockReturnValue(false);
    mocks.getEffectiveOrganizationId.mockReturnValue('org-1');
    mocks.readSupportSessionCookie.mockResolvedValue(null);
    mocks.getOrganizationSubscriptionSnapshot.mockResolvedValue({ status: 'active' });
    mocks.enforceSubscriptionRouteAccess.mockResolvedValue(undefined);
    mocks.getSubscriptionLockMessage.mockReturnValue(null);
  });

  it('redirects active client accounts to /portal', async () => {
    const auth = makeAuth({ is_client_account: true, client_account_status: 'active' });

    await expect(enforceAppEntryPolicy(auth)).rejects.toMatchObject({
      message: 'NEXT_REDIRECT:/portal',
    });
    expect(mocks.redirect).toHaveBeenCalledWith('/portal');
  });

  it('redirects pending client accounts to /start/pending', async () => {
    const auth = makeAuth({ is_client_account: true, client_account_status: 'pending' });

    await expect(enforceAppEntryPolicy(auth)).rejects.toMatchObject({
      message: 'NEXT_REDIRECT:/start/pending',
    });
    expect(mocks.redirect).toHaveBeenCalledWith('/start/pending');
  });

  it('redirects users who must change password to /start/password-reset', async () => {
    const auth = makeAuth({ must_change_password: true });

    await expect(enforceAppEntryPolicy(auth)).rejects.toMatchObject({
      message: 'NEXT_REDIRECT:/start/password-reset',
    });
  });

  it('redirects users without legal name to /start/profile-name', async () => {
    const auth = makeAuth({ full_name: null, legal_name: null, legal_name_confirmed_at: null });

    await expect(enforceAppEntryPolicy(auth)).rejects.toMatchObject({
      message: 'NEXT_REDIRECT:/start/profile-name',
    });
  });

  it('allows normal staff users to proceed (no redirect)', async () => {
    const auth = makeAuth();

    const result = await enforceAppEntryPolicy(auth);
    expect(result.effectiveOrganizationId).toBe('org-1');
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('redirects users with no memberships to /start/signup', async () => {
    const auth = makeAuth();
    auth.memberships = [];

    await expect(enforceAppEntryPolicy(auth)).rejects.toMatchObject({
      message: 'NEXT_REDIRECT:/start/signup',
    });
  });
});
