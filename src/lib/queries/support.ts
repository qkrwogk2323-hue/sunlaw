import { getCurrentAuth, isPlatformOperator } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function listSupportRequests() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('support_access_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  return data ?? [];
}

export async function listPlatformSupportTickets() {
  const auth = await getCurrentAuth();
  if (!auth) return [];

  const supabase = await createSupabaseServerClient();
  const query = supabase
    .from('platform_support_tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (isPlatformOperator(auth)) {
    const { data } = await query;
    return data ?? [];
  }

  const { data } = await query.eq('requester_profile_id', auth.user.id);
  return data ?? [];
}
