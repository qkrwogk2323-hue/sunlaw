import { getCurrentAuth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type OrganizationListOptions = {
  includeAll?: boolean;
};

export async function listAccessibleOrganizations(options: OrganizationListOptions = {}) {
  const auth = await getCurrentAuth();
  if (!auth) return [];

  const supabase = await createSupabaseServerClient();
  if (options.includeAll) {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, slug, kind, business_number, representative_name, email, phone, lifecycle_status, enabled_modules, is_directory_public, updated_at')
      .neq('lifecycle_status', 'soft_deleted')
      .order('name', { ascending: true });

    if (error) {
      console.error('[listAccessibleOrganizations] includeAll error:', error.message);
      return [];
    }

    return data ?? [];
  }

  const membershipOrganizationIds = [...new Set(auth.memberships.map((membership) => membership.organization_id).filter(Boolean))];

  const [publicOrganizationsResponse, memberOrganizationsResponse] = await Promise.all([
    supabase
      .from('organizations')
      .select('id, name, slug, kind, business_number, representative_name, email, phone, lifecycle_status, enabled_modules, is_directory_public, updated_at')
      .eq('is_directory_public', true)
      .neq('lifecycle_status', 'soft_deleted')
      .order('name', { ascending: true }),
    membershipOrganizationIds.length
      ? supabase
          .from('organizations')
          .select('id, name, slug, kind, business_number, representative_name, email, phone, lifecycle_status, enabled_modules, is_directory_public, updated_at')
          .in('id', membershipOrganizationIds)
          .neq('lifecycle_status', 'soft_deleted')
          .order('name', { ascending: true })
      : Promise.resolve({ data: [], error: null })
  ]);

  if (publicOrganizationsResponse.error || memberOrganizationsResponse.error) {
    console.error('[listAccessibleOrganizations] query error:', {
      publicOrganizations: publicOrganizationsResponse.error?.message ?? null,
      memberOrganizations: memberOrganizationsResponse.error?.message ?? null
    });
    return [];
  }

  const merged = [...(memberOrganizationsResponse.data ?? []), ...(publicOrganizationsResponse.data ?? [])];
  return merged.filter((organization, index, list) => list.findIndex((candidate) => candidate.id === organization.id) === index);

}

export async function listOrganizationMemberships(options: OrganizationListOptions = {}) {
  const auth = await getCurrentAuth();
  if (!auth) return [];

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('organization_memberships')
    .select('id, organization_id, role, actor_category, permission_template_key, case_scope_policy, status, title, permissions, is_primary, organization:organizations(id, name, slug)')
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (!options.includeAll) {
    query = query.eq('profile_id', auth.user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[listOrganizationMemberships] query error:', error.message);
    return [];
  }

  return data ?? [];
}

export async function getOrganizationWorkspace(organizationId: string) {
  const supabase = await createSupabaseServerClient();

  const { data: organization, error: organizationError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .maybeSingle();

  if (organizationError) {
    console.error('[getOrganizationWorkspace] organization error:', organizationError.message);
    return null;
  }

  if (!organization) return null;

  const [
    { data: members, error: membersError },
    { data: cases, error: casesError },
    { data: invitations, error: invitationsError },
    { count: caseCount, error: caseCountError }
  ] = await Promise.all([
    supabase
      .from('organization_memberships')
      .select('id, role, actor_category, permission_template_key, case_scope_policy, status, title, permissions, is_primary, profile:profiles(id, full_name, email)')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .order('created_at', { ascending: true }),
    supabase
      .from('cases')
      .select('id, title, reference_no, case_type, case_status, stage_key, principal_amount, updated_at')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(8),
    supabase
      .from('invitations')
      .select('id, kind, actor_category, note, role_template_key, case_scope_policy, email, invited_name, requested_role, token_hint, status, created_at, expires_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .neq('lifecycle_status', 'soft_deleted')
  ]);

  if (membersError || casesError || invitationsError || caseCountError) {
    console.error('[getOrganizationWorkspace] related query error:', {
      members: membersError?.message ?? null,
      cases: casesError?.message ?? null,
      invitations: invitationsError?.message ?? null,
      caseCount: caseCountError?.message ?? null
    });

    return {
      organization,
      members: [],
      recentCases: [],
      invitations: [],
      caseCount: 0
    };
  }

  return {
    organization,
    members: members ?? [],
    recentCases: cases ?? [],
    invitations: invitations ?? [],
    caseCount: caseCount ?? 0
  };
}

export async function listMySignupRequests() {
  const auth = await getCurrentAuth();
  if (!auth) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('organization_signup_requests')
    .select('id, organization_name, organization_kind, organization_industry, requester_email, business_number, representative_name, representative_title, contact_phone, website_url, requested_modules, status, business_registration_verification_status, business_registration_verification_note, business_registration_document_name, reviewed_note, note, created_at, reviewed_at, approved_organization_id')
    .eq('requester_profile_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load organization signup history', error);
    return [];
  }

  return data ?? [];
}
