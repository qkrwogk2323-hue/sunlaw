import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  resolveMembershipPermissions: vi.fn((membership) => membership.permissions ?? []),
  cookies: vi.fn(async () => ({ get: vi.fn() }))
}));

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    cache: <T extends (...args: any[]) => any>(fn: T) => fn
  };
});

vi.mock('next/headers', () => ({
  cookies: mocks.cookies
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn()
}));

vi.mock('@/lib/access-control', () => ({
  assertPlatformAdminAccess: vi.fn(),
  evaluateOrganizationAccess: vi.fn()
}));

vi.mock('@/lib/platform-governance', () => ({
  isPlatformManagementOrganization: vi.fn(() => false)
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient
}));

vi.mock('@/lib/permissions', () => ({
  resolveMembershipPermissions: mocks.resolveMembershipPermissions
}));

vi.mock('@/lib/view-mode', () => ({
  ACTIVE_VIEW_MODE_COOKIE: 'vs-active-view-mode',
  normalizeActiveViewMode: vi.fn((value) => value ?? 'default')
}));

function createProfilesQuerySequence(rows: Array<{ data: Record<string, unknown> | null; error: unknown | null }>) {
  let index = 0;

  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => rows[index++] ?? { data: null, error: null })
      }))
    }))
  };
}

describe('getCurrentAuth', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('repairs a missing profile row for an authenticated user before returning auth context', async () => {
    const profilesTable = createProfilesQuerySequence([
      { data: null, error: null },
      {
        data: {
          id: 'user-1',
          email: 'user@example.com',
          full_name: '테스트 사용자',
          platform_role: 'standard',
          default_organization_id: null,
          is_active: true
        },
        error: null
      },
      {
        data: {
          is_client_account: false,
          client_account_status: 'pending_initial_approval',
          client_account_status_changed_at: null,
          client_account_status_reason: null,
          client_last_approved_at: null,
          legal_name: null,
          legal_name_confirmed_at: null,
          must_change_password: false,
          must_complete_profile: false
        },
        error: null
      }
    ]);

    const membershipsTable = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({ data: [], error: null }))
          }))
        }))
      }))
    };

    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: {
            user: {
              id: 'user-1',
              email: 'user@example.com',
              user_metadata: { full_name: '테스트 사용자' }
            }
          },
          error: null
        }))
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') return profilesTable;
        if (table === 'organization_memberships') return membershipsTable;
        throw new Error(`Unexpected table: ${table}`);
      })
    });

    const upsert = vi.fn(async () => ({ error: null }));
    mocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn(() => ({ upsert }))
    });

    const { getCurrentAuth } = await import('@/lib/auth');
    const auth = await getCurrentAuth();

    expect(mocks.createSupabaseAdminClient).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith({
      id: 'user-1',
      email: 'user@example.com',
      full_name: '테스트 사용자'
    }, { onConflict: 'id' });
    expect(auth?.user.id).toBe('user-1');
    expect(auth?.profile.full_name).toBe('테스트 사용자');
    expect(auth?.memberships).toEqual([]);
  });

  it('uses email prefix as fallback name when metadata full name is missing', async () => {
    const profilesTable = createProfilesQuerySequence([
      { data: null, error: null },
      {
        data: {
          id: 'user-2',
          email: 'fallback-user@example.com',
          full_name: 'fallback-user',
          platform_role: 'standard',
          default_organization_id: null,
          is_active: true
        },
        error: null
      },
      {
        data: {
          is_client_account: false,
          client_account_status: 'pending_initial_approval',
          client_account_status_changed_at: null,
          client_account_status_reason: null,
          client_last_approved_at: null,
          legal_name: null,
          legal_name_confirmed_at: null,
          must_change_password: false,
          must_complete_profile: false
        },
        error: null
      }
    ]);

    const membershipsTable = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({ data: [], error: null }))
          }))
        }))
      }))
    };

    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: {
            user: {
              id: 'user-2',
              email: 'fallback-user@example.com',
              user_metadata: {}
            }
          },
          error: null
        }))
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') return profilesTable;
        if (table === 'organization_memberships') return membershipsTable;
        throw new Error(`Unexpected table: ${table}`);
      })
    });

    const upsert = vi.fn(async () => ({ error: null }));
    mocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn(() => ({ upsert }))
    });

    const { getCurrentAuth } = await import('@/lib/auth');
    const auth = await getCurrentAuth();

    expect(upsert).toHaveBeenCalledWith({
      id: 'user-2',
      email: 'fallback-user@example.com',
      full_name: 'fallback-user'
    }, { onConflict: 'id' });
    expect(auth?.profile.full_name).toBe('fallback-user');
  });

  it('does not attempt profile repair when authenticated user email is missing', async () => {
    const profilesTable = createProfilesQuerySequence([{ data: null, error: null }]);
    const membershipsTable = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({ data: [], error: null }))
          }))
        }))
      }))
    };

    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: {
            user: {
              id: 'user-3',
              email: null,
              user_metadata: { full_name: '이메일 없음 사용자' }
            }
          },
          error: null
        }))
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') return profilesTable;
        if (table === 'organization_memberships') return membershipsTable;
        throw new Error(`Unexpected table: ${table}`);
      })
    });

    const upsert = vi.fn(async () => ({ error: null }));
    mocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn(() => ({ upsert }))
    });

    const { getCurrentAuth } = await import('@/lib/auth');
    const auth = await getCurrentAuth();

    expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
    expect(auth).toBeNull();
  });
});