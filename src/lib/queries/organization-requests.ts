import { requirePlatformAdmin } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function listOrganizationSignupRequests() {
  await requirePlatformAdmin();
  const supabase = createSupabaseAdminClient();
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
    console.error('Failed to load organization signup requests', error);
    throw error;
  }

  return data ?? [];
}
