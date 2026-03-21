import { describe, expect, it } from 'vitest';
import { assertPlatformAdminAccess, evaluateOrganizationAccess } from '../src/lib/access-control';
import type { AuthContext } from '../src/lib/types';

function buildAuthContext(): AuthContext {
  return {
    user: {
      id: 'user-1',
      email: 'user@example.com'
    },
    profile: {
      id: 'user-1',
      email: 'user@example.com',
      full_name: 'User One',
      platform_role: 'standard',
      default_organization_id: 'org-1',
      is_active: true,
      is_client_account: false,
      client_account_status: 'pending_initial_approval',
      client_account_status_changed_at: null,
      client_account_status_reason: null,
      client_last_approved_at: null
    },
    memberships: [
      {
        id: 'membership-1',
        organization_id: 'org-1',
        role: 'org_manager',
        status: 'active',
        title: 'Manager',
        permissions: {
          notification_create: true,
          settlement_manage: false
        }
      },
      {
        id: 'membership-2',
        organization_id: 'org-2',
        role: 'org_staff',
        status: 'active',
        title: 'Staff',
        permissions: {
          settlement_manage: true
        }
      }
    ]
  };
}

describe('evaluateOrganizationAccess', () => {
  it('returns the matching membership when permission passes', () => {
    const membership = evaluateOrganizationAccess(buildAuthContext(), 'org-1', {
      permission: 'notification_create',
      requireManager: true,
      errorMessage: '알리기 권한이 없습니다.'
    });

    expect(membership.id).toBe('membership-1');
  });

  it('throws when the user has no membership in the target organization', () => {
    expect(() =>
      evaluateOrganizationAccess(buildAuthContext(), 'org-3', {
        errorMessage: '조직 접근 권한이 없습니다.'
      })
    ).toThrowError('조직 접근 권한이 없습니다.');
  });

  it('throws when manager access is required but only staff membership exists', () => {
    expect(() =>
      evaluateOrganizationAccess(buildAuthContext(), 'org-2', {
        requireManager: true,
        errorMessage: '조직 관리자 권한이 없습니다.'
      })
    ).toThrowError('조직 관리자 권한이 없습니다.');
  });

  it('throws when the required permission is missing', () => {
    expect(() =>
      evaluateOrganizationAccess(buildAuthContext(), 'org-1', {
        permission: 'settlement_manage',
        errorMessage: '정산 관리 권한이 없습니다.'
      })
    ).toThrowError('정산 관리 권한이 없습니다.');
  });
});

describe('assertPlatformAdminAccess', () => {
  it('allows platform admin view', () => {
    expect(() => assertPlatformAdminAccess(true)).not.toThrow();
  });

  it('throws when platform admin view is inactive', () => {
    expect(() => assertPlatformAdminAccess(false, '플랫폼 관리자만 접근할 수 있습니다.')).toThrowError(
      '플랫폼 관리자만 접근할 수 있습니다.'
    );
  });
});

// ─────────────────────────────────────────────────────────
// Cross-org isolation (RLS guard, JS layer)
// These verify that the JS-side access guard rejects requests
// where a user attempts to access data from an organization
// they do not belong to — simulating the server-action guard.
// ─────────────────────────────────────────────────────────
describe('Cross-org isolation — user cannot access another org', () => {
  it('blocks org-A user from accessing org-B data (no membership)', () => {
    // User is member of org-1 only; attempting org-2 access with no membership
    expect(() =>
      evaluateOrganizationAccess(buildAuthContext(), 'org-99', {
        errorMessage: '접근 권한이 없습니다.',
      })
    ).toThrowError('접근 권한이 없습니다.');
  });

  it('blocks org-A staff from case_delete in org-A (missing permission)', () => {
    const ctx = buildAuthContext();
    // org-1 membership has notification_create=true, but NOT case_delete
    expect(() =>
      evaluateOrganizationAccess(ctx, 'org-1', {
        permission: 'case_delete',
        errorMessage: '사건 삭제 권한이 없습니다.',
      })
    ).toThrowError('사건 삭제 권한이 없습니다.');
  });

  it('blocks org-B staff from manager-only action in org-B', () => {
    // org-2 membership has role=org_staff (not manager)
    expect(() =>
      evaluateOrganizationAccess(buildAuthContext(), 'org-2', {
        requireManager: true,
        errorMessage: '관리자 권한이 필요합니다.',
      })
    ).toThrowError('관리자 권한이 필요합니다.');
  });

  it('allows org-B staff to access org-B without manager requirement', () => {
    // org-2 org_staff can access without requireManager
    const membership = evaluateOrganizationAccess(buildAuthContext(), 'org-2', {
      errorMessage: '접근 불가.',
    });
    expect(membership.organization_id).toBe('org-2');
  });

  it('blocks completely unknown org (attacker forges org id)', () => {
    const forgedOrgId = 'ffffffff-0000-0000-0000-000000000000';
    expect(() =>
      evaluateOrganizationAccess(buildAuthContext(), forgedOrgId, {
        errorMessage: '조직 접근 불가.',
      })
    ).toThrowError('조직 접근 불가.');
  });

  it('blocks user with empty memberships from any org', () => {
    const noMemberCtx: AuthContext = {
      ...buildAuthContext(),
      memberships: [],
    };
    expect(() =>
      evaluateOrganizationAccess(noMemberCtx, 'org-1', {
        errorMessage: '소속 조직이 없습니다.',
      })
    ).toThrowError('소속 조직이 없습니다.');
  });

  it('blocks inactive membership from granting access', () => {
    const ctx: AuthContext = {
      ...buildAuthContext(),
      memberships: [
        {
          id: 'inactive-membership',
          organization_id: 'org-1',
          role: 'org_manager',
          status: 'inactive' as const,
          title: 'Former Manager',
          permissions: {},
        },
      ],
    };
    expect(() =>
      evaluateOrganizationAccess(ctx, 'org-1', {
        errorMessage: '비활성 멤버십입니다.',
      })
    ).toThrowError('비활성 멤버십입니다.');
  });
});