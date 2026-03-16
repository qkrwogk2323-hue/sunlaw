import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function listOrganizationSignupRequests() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('organization_signup_requests')
    .select('*, requester:profiles(id, full_name, email), reviewer:profiles(id, full_name, email), approvedOrganization:organizations(id, name, slug)')
    .order('created_at', { ascending: false });

  return data ?? [];
}
