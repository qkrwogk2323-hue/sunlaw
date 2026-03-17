import { describe, expect, it } from 'vitest';
import { getAuthenticatedHomePath, normalizeClientAccountProfile, resolveEffectiveClientAccountStatus } from '@/lib/client-account';
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
  it('downgrades an active client without accessible portal links to pending reapproval', () => {
    const auth = buildAuthContext();
    const normalizedProfile = normalizeClientAccountProfile(auth.profile, 0);

    expect(resolveEffectiveClientAccountStatus(auth.profile, 0)).toBe('pending_reapproval');
    expect(normalizedProfile.client_account_status).toBe('pending_reapproval');
    expect(getAuthenticatedHomePath({ ...auth, profile: normalizedProfile })).toBe('/start/pending');
  });

  it('keeps portal home routing when accessible portal links exist even if the stored status is pending', () => {
    const auth = buildAuthContext({
      profile: {
        is_client_account: true,
        client_account_status: 'pending_initial_approval',
        client_last_approved_at: null
      }
    });

    const normalizedProfile = normalizeClientAccountProfile(auth.profile, 2);

    expect(resolveEffectiveClientAccountStatus(auth.profile, 2)).toBe('active');
    expect(normalizedProfile.client_account_status).toBe('active');
    expect(getAuthenticatedHomePath({ ...auth, profile: normalizedProfile })).toBe('/portal');
  });
});