import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { assertPlatformAdminAccess, evaluateOrganizationAccess } from '@/lib/access-control';
import { isPlatformManagementOrganization } from '@/lib/platform-governance';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveMembershipPermissions } from '@/lib/permissions';
import type { AuthContext, Membership, PermissionKey, Profile } from '@/lib/types';
import { ACTIVE_VIEW_MODE_COOKIE, normalizeActiveViewMode } from '@/lib/view-mode';

type CoreProfile = Pick<
  Profile,
  'id' | 'email' | 'full_name' | 'platform_role' | 'default_organization_id' | 'is_active'
>;

type ClientAccountProfileFields = Pick<
  Profile,
  'is_client_account' | 'client_account_status' | 'client_account_status_changed_at' | 'client_account_status_reason' | 'client_last_approved_at' | 'legal_name' | 'legal_name_confirmed_at' | 'must_change_password' | 'must_complete_profile'
>;

const defaultClientAccountProfileFields: ClientAccountProfileFields = {
  is_client_account: false,
  client_account_status: 'pending_initial_approval',
  client_account_status_changed_at: null,
  client_account_status_reason: null,
  client_last_approved_at: null,
  legal_name: null,
  legal_name_confirmed_at: null,
  must_change_password: false,
  must_complete_profile: false
};

async function withTimeout<T>(promise: Promise<T>, timeoutMs = 9000): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('auth_timeout'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function withTimeoutRetry<T>(
  factory: () => Promise<T>,
  timeoutMs = 9000,
  retries = 1
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await withTimeout(factory(), timeoutMs);
    } catch (error) {
      lastError = error;
      if (!(error instanceof Error) || error.message !== 'auth_timeout' || attempt === retries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('auth_timeout');
}

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  return error?.code === '42703'
    || error?.code === 'PGRST204'
    || Boolean(error?.message?.includes('column'));
}

async function getProfileWithScopedFields(userId: string): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();

  const { data: coreProfile, error: coreProfileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, platform_role, default_organization_id, is_active')
    .eq('id', userId)
    .maybeSingle();

  if (coreProfileError) {
    throw coreProfileError;
  }

  if (!coreProfile || !coreProfile.is_active) {
    return null;
  }

  const { data: clientAccountFields, error: clientAccountError } = await supabase
    .from('profiles')
    .select('is_client_account, client_account_status, client_account_status_changed_at, client_account_status_reason, client_last_approved_at, legal_name, legal_name_confirmed_at, must_change_password, must_complete_profile')
    .eq('id', userId)
    .maybeSingle();

  if (clientAccountError && !isMissingColumnError(clientAccountError)) {
    throw clientAccountError;
  }

  return {
    ...(coreProfile as CoreProfile),
    ...defaultClientAccountProfileFields,
    ...((clientAccountError ? null : clientAccountFields) ?? {})
  };
}

export async function hasPlatformAdminSecurityClearance(auth: AuthContext) {
  return isPlatformOperator(auth);
}

export async function hasPlatformAdminScenarioAccess(auth: AuthContext) {
  if (!(await hasPlatformAdminSecurityClearance(auth))) return false;
  return false;
}

export const getCurrentAuth = cache(async (): Promise<AuthContext | null> => {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError
    } = await withTimeoutRetry(() => supabase.auth.getUser(), 9000, 1);

    if (userError || !user) {
      return null;
    }

    const profile = await withTimeoutRetry(() => getProfileWithScopedFields(user.id), 9000, 1);

    if (!profile || !profile.is_active) {
      return null;
    }

    const membershipQuery = supabase
      .from('organization_memberships')
      .select(`
        id,
        organization_id,
        role,
        status,
        title,
        permissions,
        actor_category,
        permission_template_key,
        case_scope_policy,
        organization:organizations(id, name, slug, kind, is_platform_root, enabled_modules),
        permission_overrides:organization_membership_permission_overrides(permission_key, effect)
      `)
      .eq('profile_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    const { data: memberships } = await withTimeoutRetry<any>(() => Promise.resolve(membershipQuery), 9000, 1);

    return {
      user: {
        id: user.id,
        email: user.email ?? undefined
      },
      profile,
      memberships: ((memberships ?? []) as unknown[]).map((membership) => {
        const normalized = membership as Membership & {
          organization?: Membership['organization'] | Membership['organization'][];
        };

        return {
          ...normalized,
          organization: Array.isArray(normalized.organization)
            ? normalized.organization[0] ?? null
            : normalized.organization ?? null,
          permissions: resolveMembershipPermissions(normalized as Membership)
        };
      })
    };
  } catch (error) {
    console.error('getCurrentAuth failed', error);
    return null;
  }
});

export async function requireAuthenticatedUser() {
  const auth = await getCurrentAuth();
  if (!auth) {
    redirect('/login');
  }
  return auth;
}

export async function getActiveViewMode() {
  const cookieStore = await cookies();
  return normalizeActiveViewMode(cookieStore.get(ACTIVE_VIEW_MODE_COOKIE)?.value);
}

export function getPlatformOrganizationContextId(auth: AuthContext) {
  const membership = auth.memberships.find((item) => (
    isPlatformManagementOrganization(item.organization)
    && isManagementRole(item.role)
  ));
  return membership?.organization_id ?? null;
}

export async function hasActivePlatformAdminView(auth: AuthContext, organizationId: string | null | undefined) {
  if (!organizationId) return false;

  const membership = auth.memberships.find((item) => item.organization_id === organizationId) ?? null;
  if (!membership) return false;

  return Boolean(
    isPlatformManagementOrganization(membership.organization)
    && isManagementRole(membership.role)
    && hasPlatformAdminSecurityClearance(auth)
  );
}

export async function hasActivePlatformScenarioView(auth: AuthContext, activeViewMode?: string | null) {
  void auth;
  void activeViewMode;
  return false;
}

export async function requirePlatformAdmin(organizationId?: string | null) {
  const auth = await requireAuthenticatedUser();
  const platformOrganizationId = organizationId ?? getPlatformOrganizationContextId(auth);
  if (!(await hasActivePlatformAdminView(auth, platformOrganizationId))) {
    redirect('/dashboard');
  }
  return auth;
}

export async function requirePlatformAdminAction(errorMessage = '플랫폼 관리자만 접근할 수 있습니다.', organizationId?: string | null) {
  const auth = await requireAuthenticatedUser();
  const platformOrganizationId = organizationId ?? getPlatformOrganizationContextId(auth);
  assertPlatformAdminAccess(await hasActivePlatformAdminView(auth, platformOrganizationId), errorMessage);
  return auth;
}

export function getEffectiveOrganizationId(auth: AuthContext) {
  return auth.profile.default_organization_id ?? auth.memberships[0]?.organization_id ?? null;
}

export function findMembership(auth: AuthContext, organizationId: string) {
  return auth.memberships.find((membership) => membership.organization_id === organizationId) ?? null;
}

export function isManagementRole(role?: string | null) {
  return role === 'org_owner' || role === 'org_manager';
}

export function hasPlatformManagementMembership(auth: AuthContext) {
  return auth.memberships.some((membership) => (
    isPlatformManagementOrganization(membership.organization)
    && isManagementRole(membership.role)
  ));
}

export function isPlatformOperator(auth: AuthContext) {
  return hasPlatformManagementMembership(auth);
}

export function hasStaffMembership(auth: AuthContext, organizationId: string) {
  return auth.memberships.some((membership) => membership.organization_id === organizationId);
}

type OrganizationActionAccessOptions = {
  permission?: PermissionKey;
  requireManager?: boolean;
  errorMessage?: string;
};

export async function requireOrganizationActionAccess(
  organizationId: string,
  options: OrganizationActionAccessOptions = {}
) {
  const auth = await requireAuthenticatedUser();
  const membership = evaluateOrganizationAccess(auth, organizationId, options);
  return { auth, membership };
}
