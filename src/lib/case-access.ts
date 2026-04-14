import { notFound } from 'next/navigation';
import { requireAuthenticatedUser, findMembership } from '@/lib/auth';
import { getCaseScopeAccess } from '@/lib/case-scope';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AuthContext } from '@/lib/types';

export type RequireCaseAccessOptions = {
  select?: string;
  insolvencySubtypePrefix?: 'rehabilitation' | 'bankruptcy';
};

export type RequireCaseAccessResult<T> = {
  auth: AuthContext;
  caseRow: T;
};

export async function requireCaseAccess<T extends Record<string, unknown> = Record<string, unknown>>(
  caseId: string,
  options: RequireCaseAccessOptions = {}
): Promise<RequireCaseAccessResult<T>> {
  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const select = options.select ?? 'id, organization_id, case_type, insolvency_subtype, lifecycle_status';

  const { data: caseRow } = await supabase
    .from('cases')
    .select(select)
    .eq('id', caseId)
    .maybeSingle();

  if (!caseRow) notFound();
  const typed = caseRow as unknown as {
    organization_id: string;
    lifecycle_status?: string | null;
    insolvency_subtype?: string | null;
  };

  if (typed.lifecycle_status === 'archived') notFound();

  if (!findMembership(auth, typed.organization_id)) notFound();

  const scope = await getCaseScopeAccess(auth, typed.organization_id);
  if (scope.restrictedOrganizationIds.length && !scope.assignedCaseIds.includes(caseId)) {
    notFound();
  }

  if (options.insolvencySubtypePrefix) {
    const subtype = typed.insolvency_subtype ?? '';
    const suffix = options.insolvencySubtypePrefix;
    if (!subtype.endsWith(`_${suffix}`)) notFound();
  }

  return { auth, caseRow: caseRow as unknown as T };
}
