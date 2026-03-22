import { getCurrentAuth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function escapeIlikeValue(value: string) {
  return value.replace(/[\\%_,]/g, (token) => `\\${token}`);
}

export async function searchPublicOrganizations(query?: string) {
  const admin = createSupabaseAdminClient();
  const normalizedQuery = query?.trim() ?? '';

  let queryBuilder = admin
    .from('organizations')
    .select('id, name, slug, kind, lifecycle_status, is_directory_public')
    .neq('lifecycle_status', 'soft_deleted')
    .eq('is_directory_public', true);

  if (normalizedQuery) {
    const escapedQuery = escapeIlikeValue(normalizedQuery);
    queryBuilder = queryBuilder.or(`name.ilike.%${escapedQuery}%,slug.ilike.%${escapedQuery}%`);
  }

  const { data, error } = await queryBuilder
    .order('name', { ascending: true })
    .limit(24);

  if (error) {
    console.error('[searchPublicOrganizations] query failed', {
      query: normalizedQuery,
      message: error.message,
      code: error.code ?? null,
      details: error.details ?? null,
      hint: error.hint ?? null
    });
    return [];
  }

  return data ?? [];
}

export async function listMyClientAccessRequests() {
  const auth = await getCurrentAuth();
  if (!auth) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('client_access_requests')
    .select('id, target_organization_id, target_organization_key, requester_profile_id, requester_name, requester_email, status, request_note, review_note, reviewed_at, created_at, organization:organizations(id, name, slug)')
    .eq('requester_profile_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[listMyClientAccessRequests] query failed', {
      userId: auth.user.id,
      message: error.message,
      code: error.code ?? null,
      details: error.details ?? null,
      hint: error.hint ?? null
    });
    return [];
  }

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
