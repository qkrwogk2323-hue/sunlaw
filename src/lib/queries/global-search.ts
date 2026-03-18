import { getCurrentAuth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type GlobalSearchResult = {
  cases: Array<{ id: string; title: string; stage_key: string | null; organization_id: string }>;
  clients: Array<{ id: string; full_name: string; email: string; default_organization_id: string | null }>;
  documents: Array<{ id: string; title: string; case_id: string; updated_at: string }>;
};

export async function searchGlobalWorkspace(query: string, limit = 8): Promise<GlobalSearchResult> {
  const auth = await getCurrentAuth();
  if (!auth) {
    return { cases: [], clients: [], documents: [] };
  }

  const keyword = query.trim();
  if (keyword.length < 2) {
    return { cases: [], clients: [], documents: [] };
  }

  const supabase = await createSupabaseServerClient();
  const organizationIds = auth.memberships.map((membership) => membership.organization_id);
  if (!organizationIds.length) {
    return { cases: [], clients: [], documents: [] };
  }

  const ilike = `%${keyword.replace(/[%_]/g, '')}%`;

  const [casesRes, clientsRes, docsRes] = await Promise.all([
    supabase
      .from('cases')
      .select('id, title, stage_key, organization_id')
      .in('organization_id', organizationIds)
      .ilike('title', ilike)
      .order('updated_at', { ascending: false })
      .limit(limit),
    supabase
      .from('profiles')
      .select('id, full_name, email, default_organization_id')
      .eq('is_client_account', true)
      .ilike('full_name', ilike)
      .order('updated_at', { ascending: false })
      .limit(limit),
    supabase
      .from('case_documents')
      .select('id, title, case_id, updated_at, organization_id')
      .in('organization_id', organizationIds)
      .ilike('title', ilike)
      .order('updated_at', { ascending: false })
      .limit(limit)
  ]);

  if (casesRes.error) throw casesRes.error;
  if (clientsRes.error) throw clientsRes.error;
  if (docsRes.error) throw docsRes.error;

  return {
    cases: (casesRes.data ?? []).map((row: any) => ({
      id: row.id,
      title: row.title,
      stage_key: row.stage_key ?? null,
      organization_id: row.organization_id
    })),
    clients: (clientsRes.data ?? []).map((row: any) => ({
      id: row.id,
      full_name: row.full_name ?? '이름 없음',
      email: row.email ?? '',
      default_organization_id: row.default_organization_id ?? null
    })),
    documents: (docsRes.data ?? []).map((row: any) => ({
      id: row.id,
      title: row.title,
      case_id: row.case_id,
      updated_at: row.updated_at
    }))
  };
}
