import { describe, expect, it } from 'vitest';
import { getAuthenticatedHomePath, isClientAccountActive, isClientAccountPending } from '../src/lib/client-account';
import type { AuthContext } from '../src/lib/types';

function buildActiveClientAuth(): AuthContext {
  return {
    user: { id: 'client-1', email: 'client@example.com' },
    profile: {
      id: 'client-1',
      email: 'client@example.com',
      full_name: '홍길동',
      platform_role: 'platform_user',
      default_organization_id: null,
      is_active: true,
      is_client_account: true,
      client_account_status: 'active',
      client_account_status_changed_at: '2024-01-01T00:00:00Z',
      client_account_status_reason: null,
      client_last_approved_at: '2024-01-01T00:00:00Z',
      legal_name: '홍길동',
      legal_name_confirmed_at: '2024-01-01T00:00:00Z'
    },
    memberships: []
  };
}

function buildPendingClientAuth(): AuthContext {
  return {
    user: { id: 'client-2', email: 'pending@example.com' },
    profile: {
      id: 'client-2',
      email: 'pending@example.com',
      full_name: '김철수',
      platform_role: 'platform_user',
      default_organization_id: null,
      is_active: true,
      is_client_account: true,
      client_account_status: 'pending_initial_approval',
      client_account_status_changed_at: null,
      client_account_status_reason: null,
      client_last_approved_at: null,
      legal_name: '김철수',
      legal_name_confirmed_at: '2024-01-01T00:00:00Z'
    },
    memberships: []
  };
}

describe('isClientAccountActive', () => {
  it('returns true when client_account_status is active', () => {
    const auth = buildActiveClientAuth();
    expect(isClientAccountActive(auth.profile)).toBe(true);
  });

  it('returns false when client_account_status is pending', () => {
    const auth = buildPendingClientAuth();
    expect(isClientAccountActive(auth.profile)).toBe(false);
  });
});

describe('isClientAccountPending', () => {
  it('returns true when client_account_status is not active', () => {
    const auth = buildPendingClientAuth();
    expect(isClientAccountPending(auth.profile)).toBe(true);
  });

  it('returns false when client_account_status is active', () => {
    const auth = buildActiveClientAuth();
    expect(isClientAccountPending(auth.profile)).toBe(false);
  });
});

describe('getAuthenticatedHomePath', () => {
  it('returns /portal for active client with 1 or more active links', () => {
    const auth = buildActiveClientAuth();
    expect(getAuthenticatedHomePath(auth, { activePortalLinkCount: 1 })).toBe('/portal');
    expect(getAuthenticatedHomePath(auth, { activePortalLinkCount: 3 })).toBe('/portal');
  });

  it('returns /start/pending for active client with 0 active links', () => {
    const auth = buildActiveClientAuth();
    expect(getAuthenticatedHomePath(auth, { activePortalLinkCount: 0 })).toBe('/start/pending');
  });

  it('returns /portal for active client when activePortalLinkCount is not provided (backwards-compatible)', () => {
    const auth = buildActiveClientAuth();
    expect(getAuthenticatedHomePath(auth)).toBe('/portal');
  });

  it('returns /start/pending for pending client regardless of link count', () => {
    const auth = buildPendingClientAuth();
    expect(getAuthenticatedHomePath(auth, { activePortalLinkCount: 0 })).toBe('/start/pending');
    expect(getAuthenticatedHomePath(auth, { activePortalLinkCount: 1 })).toBe('/start/pending');
    expect(getAuthenticatedHomePath(auth)).toBe('/start/pending');
  });

  it('returns /dashboard for non-client with memberships', () => {
    const auth: AuthContext = {
      user: { id: 'staff-1', email: 'staff@example.com' },
      profile: {
        id: 'staff-1',
        email: 'staff@example.com',
        full_name: '이직원',
        platform_role: 'platform_user',
        default_organization_id: 'org-1',
        is_active: true,
        is_client_account: false,
        client_account_status: 'pending_initial_approval',
        client_account_status_changed_at: null,
        client_account_status_reason: null,
        client_last_approved_at: null,
        legal_name: null,
        legal_name_confirmed_at: null
      },
      memberships: [
        {
          id: 'membership-1',
          organization_id: 'org-1',
          role: 'org_staff',
          status: 'active',
          title: '직원',
          permissions: {},
          actor_category: 'staff',
          permission_template_key: 'office_manager',
          case_scope_policy: 'assigned_cases_only',
          organization: { id: 'org-1', name: '테스트 조직', slug: 'test-org', kind: 'law_firm', enabled_modules: {} },
          permission_overrides: []
        }
      ]
    };
    expect(getAuthenticatedHomePath(auth)).toBe('/dashboard');
  });
});
