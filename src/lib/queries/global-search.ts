import { getCurrentAuth } from '@/lib/auth';
import { getCaseScopeAccess } from '@/lib/case-scope';
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
  const scope = await getCaseScopeAccess(auth, null);
  const hasRestrictedScope = scope.restrictedOrganizationIds.length > 0;
  if (hasRestrictedScope && !scope.assignedCaseIds.length && !scope.unrestrictedOrganizationIds.length) {
    return { cases: [], clients: [], documents: [] };
  }

  const ilike = `%${keyword.replace(/[%_]/g, '')}%`;

  let casesQuery = supabase
    .from('cases')
    .select('id, title, stage_key, organization_id')
    .in('organization_id', organizationIds)
    .ilike('title', ilike)
    .order('updated_at', { ascending: false })
    .limit(limit);
  let docsQuery = supabase
    .from('case_documents')
    .select('id, title, case_id, updated_at, organization_id')
    .in('organization_id', organizationIds)
    .ilike('title', ilike)
    .order('updated_at', { ascending: false })
    .limit(limit);
  let clientsQuery = supabase
    .from('case_clients')
    .select('id, profile_id, client_name, client_email_snapshot, organization_id, case_id, created_at')
    .in('organization_id', organizationIds)
    .ilike('client_name', ilike)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (hasRestrictedScope) {
    const assignedFilter = scope.assignedCaseIds.length ? `id.in.(${scope.assignedCaseIds.join(',')})` : '';
    const assignedCaseFilter = scope.assignedCaseIds.length ? `case_id.in.(${scope.assignedCaseIds.join(',')})` : '';
    if (scope.unrestrictedOrganizationIds.length) {
      const orgFilter = `organization_id.in.(${scope.unrestrictedOrganizationIds.join(',')})`;
      casesQuery = casesQuery.or(assignedFilter ? `${orgFilter},${assignedFilter}` : orgFilter);
      docsQuery = docsQuery.or(assignedCaseFilter ? `${orgFilter},${assignedCaseFilter}` : orgFilter);
      clientsQuery = clientsQuery.or(assignedCaseFilter ? `${orgFilter},${assignedCaseFilter}` : orgFilter);
    } else {
      casesQuery = casesQuery.in('id', scope.assignedCaseIds);
      docsQuery = docsQuery.in('case_id', scope.assignedCaseIds);
      clientsQuery = clientsQuery.in('case_id', scope.assignedCaseIds);
    }
  }

  const [casesRes, clientsRes, docsRes] = await Promise.all([casesQuery, clientsQuery, docsQuery]);

  if (casesRes.error || clientsRes.error || docsRes.error) {
    console.error('[searchGlobalWorkspace] query error:', {
      cases: casesRes.error?.message ?? null,
      clients: clientsRes.error?.message ?? null,
      documents: docsRes.error?.message ?? null
    });
    return { cases: [], clients: [], documents: [] };
  }

  return {
    cases: (casesRes.data ?? []).map((row: any) => ({
      id: row.id,
      title: row.title,
      stage_key: row.stage_key ?? null,
      organization_id: row.organization_id
    })),
    clients: (clientsRes.data ?? []).map((row: any) => ({
      id: row.profile_id ?? row.id,
      full_name: row.client_name ?? '이름 없음',
      email: row.client_email_snapshot ?? '',
      default_organization_id: row.organization_id ?? null
    })),
    documents: (docsRes.data ?? []).map((row: any) => ({
      id: row.id,
      title: row.title,
      case_id: row.case_id,
      updated_at: row.updated_at
    }))
  };
}
