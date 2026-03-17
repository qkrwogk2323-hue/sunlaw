import { describe, expect, it } from 'vitest';
import {
  getAuthenticatedHomePath,
  hasCompletedLegalName,
  isClientAccountActive,
  isClientAccountPending
} from '@/lib/client-account';
import type { AuthContext } from '@/lib/types';

type AuthContextOverrides = Omit<Partial<AuthContext>, 'profile'> & {
  profile?: Partial<AuthContext['profile']>;
};

function buildAuthContext(overrides?: AuthContextOverrides): AuthContext {
  const { profile: profileOverrides, ...authOverrides } = overrides ?? {};
  const baseProfile: AuthContext['profile'] = {
    id: 'client-1',
    email: 'client@example.com',
    full_name: '의뢰인',
    legal_name: '의뢰인',
    legal_name_confirmed_at: '2026-03-17T00:00:00.000Z',
    platform_role: 'standard',
    default_organization_id: null,
    is_active: true,
    is_client_account: true,
    client_account_status: 'active',
    client_account_status_changed_at: null,
    client_account_status_reason: null,
    client_last_approved_at: '2026-03-16T00:00:00.000Z'
  };

  const baseAuthContext: AuthContext = {
    user: {
      id: 'client-1',
      email: 'client@example.com'
    },
    profile: baseProfile,
    memberships: []
  };

  return {
    ...baseAuthContext,
    ...authOverrides,
    profile: {
      ...baseProfile,
      ...(profileOverrides ?? {})
    }
  };
}

describe('client account portal state contract', () => {
  it('routes to pending for stored pending client accounts', () => {
    const auth = buildAuthContext({
      profile: {
        client_account_status: 'pending_reapproval'
      }
    });

    expect(isClientAccountPending(auth.profile)).toBe(true);
    expect(isClientAccountActive(auth.profile)).toBe(false);
    expect(getAuthenticatedHomePath(auth)).toBe('/start/pending');
  });

  it('routes to portal for stored active client accounts', () => {
    const auth = buildAuthContext();

    expect(isClientAccountActive(auth.profile)).toBe(true);
    expect(isClientAccountPending(auth.profile)).toBe(false);
    expect(getAuthenticatedHomePath(auth)).toBe('/portal');
  });

  it('routes to profile-name before any client account branch when legal name is incomplete', () => {
    const auth = buildAuthContext({
      profile: {
        full_name: '',
        legal_name: null,
        legal_name_confirmed_at: null,
        client_account_status: 'active'
      }
    });

    expect(hasCompletedLegalName(auth.profile)).toBe(false);
    expect(getAuthenticatedHomePath(auth)).toBe('/start/profile-name');
  });

  it('routes to signup for standard users without memberships who are not client accounts', () => {
    const auth = buildAuthContext({
      profile: {
        is_client_account: false,
        client_account_status: 'pending_initial_approval'
      }
    });

    expect(isClientAccountPending(auth.profile)).toBe(false);
    expect(isClientAccountActive(auth.profile)).toBe(false);
    expect(getAuthenticatedHomePath(auth)).toBe('/start/signup');
  });
});