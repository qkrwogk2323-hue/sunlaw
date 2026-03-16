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
