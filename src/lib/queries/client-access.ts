import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function searchPublicOrganizations(query?: string) {
  const admin = createSupabaseAdminClient();
  const normalizedQuery = query?.trim().toLowerCase() ?? '';

  const { data } = await admin
    .from('organizations')
    .select('id, name, slug, kind, lifecycle_status, is_directory_public')
    .neq('lifecycle_status', 'soft_deleted')
    .eq('is_directory_public', true)
    .order('name', { ascending: true })
    .limit(24);

  const organizations = data ?? [];
  if (!normalizedQuery) return organizations;

  return organizations.filter((organization) => {
    const target = `${organization.name ?? ''} ${organization.slug ?? ''}`.toLowerCase();
    return target.includes(normalizedQuery);
  });
}

export async function listMyClientAccessRequests() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('client_access_requests')
    .select('id, target_organization_id, target_organization_key, requester_profile_id, requester_name, requester_email, status, request_note, review_note, reviewed_at, created_at, organization:organizations(id, name, slug)')
    .order('created_at', { ascending: false });

  return data ?? [];
}

export async function listOrganizationClientAccessRequests(organizationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('client_access_requests')
    .select('id, target_organization_id, target_organization_key, requester_profile_id, requester_name, requester_email, status, request_note, review_note, reviewed_at, created_at')
    .eq('target_organization_id', organizationId)
    .order('created_at', { ascending: false });

  return data ?? [];
}