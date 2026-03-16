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