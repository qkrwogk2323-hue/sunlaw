import { getCurrentAuth, getPlatformOrganizationContextId, hasActivePlatformAdminView } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function createOrganizationRequestReader() {
  const auth = await getCurrentAuth();
  const canUseAdminClient = auth
    ? await hasActivePlatformAdminView(auth, getPlatformOrganizationContextId(auth))
    : false;

  return canUseAdminClient ? createSupabaseAdminClient() : await createSupabaseServerClient();
}

export async function listOrganizationSignupRequests() {
  const supabase = await createOrganizationRequestReader();
  const { data, error } = await supabase
    .from('organization_signup_requests')
    .select(`
      *,
      requester:profiles!organization_signup_requests_requester_profile_id_fkey(id, full_name, email),
      reviewer:profiles!organization_signup_requests_reviewed_by_fkey(id, full_name, email),
      approvedOrganization:organizations!organization_signup_requests_approved_organization_id_fkey(id, name, slug)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[listOrganizationSignupRequests] query error:', error.message, error.code, error.details);
    // fallback: simpler query without FK joins to diagnose if the issue is FK hint names
    const { data: fallback, error: fallbackError } = await supabase
      .from('organization_signup_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (fallbackError) {
      console.error('[listOrganizationSignupRequests] fallback query also failed:', fallbackError.message);
      return [];
    }
    console.warn('[listOrganizationSignupRequests] using fallback query without joins, count:', fallback?.length ?? 0);
    return fallback ?? [];
  }

  return data ?? [];
}

export async function listOrganizationExitRequests() {
  const supabase = await createOrganizationRequestReader();
  const { data, error } = await supabase
    .from('organization_exit_requests')
    .select(`
      *,
      organization:organizations!organization_exit_requests_organization_id_fkey(id, name, slug),
      requester:profiles!organization_exit_requests_requested_by_profile_id_fkey(id, full_name, email),
      reviewer:profiles!organization_exit_requests_reviewed_by_profile_id_fkey(id, full_name, email)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[listOrganizationExitRequests] query error:', error.message);
    return [];
  }

  return data ?? [];
}

export async function getLatestOrganizationExitRequest(organizationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('organization_exit_requests')
    .select('*, requester:profiles(id, full_name, email), reviewer:profiles(id, full_name, email)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}
