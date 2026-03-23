import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { assertPlatformAdminAccess, evaluateOrganizationAccess } from '@/lib/access-control';
import { isPlatformManagementOrganization } from '@/lib/platform-governance';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveMembershipPermissions } from '@/lib/permissions';
import type { AuthContext, Membership, PermissionKey, Profile } from '@/lib/types';
import { ACTIVE_VIEW_MODE_COOKIE, normalizeActiveViewMode } from '@/lib/view-mode';
import { notifyPlatformBugAlert } from '@/lib/platform-alerts';

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

function resolveFallbackProfileName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}) {
  const fullName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : '';
  if (fullName) return fullName;

  const name = typeof user.user_metadata?.name === 'string' ? user.user_metadata.name.trim() : '';
  if (name) return name;

  const emailPrefix = user.email?.split('@')[0]?.trim();
  if (emailPrefix) return emailPrefix;

  return '사용자';
}

async function ensureProfileExists(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}) {
  const email = user.email?.trim();
  if (!email) {
    return false;
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from('profiles').upsert({
    id: user.id,
    email,
    full_name: resolveFallbackProfileName(user)
  }, { onConflict: 'id' });

  if (error) {
    throw error;
  }

  return true;
}

async function getProfileWithScopedFields(userId: string): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();

  // Single combined query — avoids a second round-trip to the profiles table.
  const { data: fullProfile, error: fullProfileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, platform_role, default_organization_id, is_active, is_client_account, client_account_status, client_account_status_changed_at, client_account_status_reason, client_last_approved_at, legal_name, legal_name_confirmed_at, must_change_password, must_complete_profile')
    .eq('id', userId)
    .maybeSingle();

  // If the combined query hits a missing-column error (legacy schema), fall back to core-only.
  if (fullProfileError && isMissingColumnError(fullProfileError)) {
    const { data: coreProfile, error: coreProfileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, platform_role, default_organization_id, is_active')
      .eq('id', userId)
      .maybeSingle();

    if (coreProfileError) throw coreProfileError;
    if (!coreProfile || !coreProfile.is_active) return null;

    return {
      ...(coreProfile as CoreProfile),
      ...defaultClientAccountProfileFields
    };
  }

  if (fullProfileError) throw fullProfileError;
  if (!fullProfile || !fullProfile.is_active) return null;

  return {
    ...defaultClientAccountProfileFields,
    ...(fullProfile as unknown as Profile)
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

    let profile = await withTimeoutRetry(() => getProfileWithScopedFields(user.id), 9000, 1);

    if (!profile) {
      const recovered = await withTimeoutRetry(() => ensureProfileExists(user), 9000, 0);
      if (recovered) {
        profile = await withTimeoutRetry(() => getProfileWithScopedFields(user.id), 9000, 1);
      }
    }

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
    redirect(getDefaultAppRoute(auth));
  }
  return auth;
}

export async function requirePlatformAdminAction(errorMessage = '플랫폼 관리자만 접근할 수 있습니다.', organizationId?: string | null) {
  const auth = await requireAuthenticatedUser();
  const platformOrganizationId = organizationId ?? getPlatformOrganizationContextId(auth);
  const canAccess = await hasActivePlatformAdminView(auth, platformOrganizationId);
  if (!canAccess) {
    await notifyPlatformBugAlert({
      actorId: auth.user.id,
      organizationId: getEffectiveOrganizationId(auth),
      title: '일반 조직에서 플랫폼 전용 기능 실행이 시도되었습니다.',
      body: errorMessage,
      actionHref: '/admin/audit',
      actionLabel: '권한 오류 기록 확인',
      resourceType: 'platform_access_violation',
      meta: {
        requestedPlatformOrganizationId: platformOrganizationId,
        currentOrganizationId: getEffectiveOrganizationId(auth)
      }
    });
  }
  assertPlatformAdminAccess(canAccess, errorMessage);
  return auth;
}

export function getEffectiveOrganizationId(auth: AuthContext) {
  const activeMemberships = auth.memberships.filter((membership) => membership.status === 'active');
  const preferredMembership = activeMemberships.find(
    (membership) => membership.organization_id === auth.profile.default_organization_id
  );

  if (preferredMembership) {
    return preferredMembership.organization_id;
  }

  return activeMemberships[0]?.organization_id ?? auth.memberships[0]?.organization_id ?? null;
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

export function hasPlatformViewForOrganization(auth: AuthContext, organizationId?: string | null) {
  const effectiveOrganizationId = organizationId ?? getEffectiveOrganizationId(auth);
  if (!effectiveOrganizationId) return false;

  const membership = auth.memberships.find((item) => item.organization_id === effectiveOrganizationId) ?? null;
  return Boolean(
    membership
    && isPlatformManagementOrganization(membership.organization)
    && isManagementRole(membership.role)
  );
}

export function getDefaultAppRoute(auth: AuthContext, organizationId?: string | null) {
  return hasPlatformViewForOrganization(auth, organizationId) ? '/product-home' : '/dashboard';
}

export function getTopLevelAppRoutes(auth: AuthContext, organizationId?: string | null): Route[] {
  if (hasPlatformViewForOrganization(auth, organizationId)) {
    return ['/product-home', '/admin/organization-requests', '/admin/organizations', '/admin/support', '/admin/audit', '/settings/organization'];
  }

  return ['/dashboard', '/inbox', '/cases', '/clients', '/organizations', '/collections', '/documents', '/notifications', '/calendar', '/reports', '/settings'];
}

export function isPathAllowedForOrganization(auth: AuthContext, pathname: string, organizationId?: string | null) {
  const topLevelRoutes = getTopLevelAppRoutes(auth, organizationId);
  return topLevelRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
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

export async function requireOrganizationUserManagementAccess(
  organizationId: string,
  errorMessage = '구성원 관리 권한이 없습니다.'
) {
  return requireOrganizationActionAccess(organizationId, {
    permission: 'user_manage',
    requireManager: true,
    errorMessage
  });
}
