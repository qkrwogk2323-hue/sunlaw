import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getOrganizationExitRequestSummary(organizationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('organization_exit_requests')
    .select('id, status, reason, review_note, reviewed_at, created_at, requested_by_profile:profiles(full_name), reviewed_by_profile:profiles(full_name)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(5);

  return data ?? [];
}

export async function listOrganizationExitRequests() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('organization_exit_requests')
    .select('id, organization_id, status, reason, review_note, reviewed_at, created_at, organization:organizations(name, slug), requested_by_profile:profiles(full_name, email), reviewed_by_profile:profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(100);

  return data ?? [];
}
