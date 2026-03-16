import { getCurrentAuth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function listAccessibleOrganizations() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('organizations')
    .select('id, name, slug, kind, business_number, representative_name, email, phone, lifecycle_status, enabled_modules, is_directory_public, updated_at')
    .order('name', { ascending: true });

  return data ?? [];
}

export async function listOrganizationMemberships() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('organization_memberships')
    .select('id, organization_id, role, actor_category, permission_template_key, case_scope_policy, status, title, permissions, is_primary, organization:organizations(id, name, slug)')
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  return data ?? [];
}

export async function getOrganizationWorkspace(organizationId: string) {
  const supabase = await createSupabaseServerClient();

  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .maybeSingle();

  if (!organization) return null;

  const [{ data: members }, { data: cases }, { data: invitations }, { count: caseCount }] = await Promise.all([
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
    .select('id, organization_name, organization_kind, requester_email, business_number, representative_name, representative_title, contact_phone, website_url, requested_modules, status, business_registration_verification_status, business_registration_verification_note, business_registration_document_name, reviewed_note, note, created_at')
    .eq('requester_profile_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load organization signup history', error);
    return [];
  }

  return data ?? [];
}
