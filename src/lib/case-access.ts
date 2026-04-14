import { notFound } from 'next/navigation';
import { requireAuthenticatedUser, findMembership, getCurrentAuth } from '@/lib/auth';
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

export type CaseActionAccessDenied = {
  ok: false;
  code: 'UNAUTHENTICATED' | 'NOT_FOUND' | 'NO_ACCESS' | 'WRONG_TYPE';
  userMessage: string;
};

export type CaseActionAccessGranted<T> = {
  ok: true;
  auth: AuthContext;
  caseRow: T;
};

export type CaseActionAccessResult<T> = CaseActionAccessGranted<T> | CaseActionAccessDenied;

export type CheckCaseActionAccessOptions = {
  organizationId?: string;
  select?: string;
  insolvencySubtypePrefix?: 'rehabilitation' | 'bankruptcy';
};

export async function checkCaseActionAccess<T extends Record<string, unknown> = Record<string, unknown>>(
  caseId: string,
  options: CheckCaseActionAccessOptions = {}
): Promise<CaseActionAccessResult<T>> {
  const auth = await getCurrentAuth();
  if (!auth) {
    return { ok: false, code: 'UNAUTHENTICATED', userMessage: '로그인이 필요합니다.' };
  }

  const supabase = await createSupabaseServerClient();
  const select = options.select ?? 'id, organization_id, case_type, insolvency_subtype, lifecycle_status';

  const { data: caseRow } = await supabase
    .from('cases')
    .select(select)
    .eq('id', caseId)
    .maybeSingle();

  if (!caseRow) {
    return { ok: false, code: 'NOT_FOUND', userMessage: '사건을 찾을 수 없습니다.' };
  }

  const typed = caseRow as unknown as {
    organization_id: string;
    lifecycle_status?: string | null;
    insolvency_subtype?: string | null;
  };

  if (typed.lifecycle_status === 'archived') {
    return { ok: false, code: 'NOT_FOUND', userMessage: '보관 처리된 사건입니다.' };
  }

  if (options.organizationId && options.organizationId !== typed.organization_id) {
    return { ok: false, code: 'NO_ACCESS', userMessage: '해당 사건과 조직이 일치하지 않습니다.' };
  }

  if (!findMembership(auth, typed.organization_id)) {
    return { ok: false, code: 'NO_ACCESS', userMessage: '접근 권한이 없습니다.' };
  }

  const scope = await getCaseScopeAccess(auth, typed.organization_id);
  if (scope.restrictedOrganizationIds.length && !scope.assignedCaseIds.includes(caseId)) {
    return { ok: false, code: 'NO_ACCESS', userMessage: '배정된 사건이 아닙니다.' };
  }

  if (options.insolvencySubtypePrefix) {
    const subtype = typed.insolvency_subtype ?? '';
    const suffix = options.insolvencySubtypePrefix;
    if (!subtype.endsWith(`_${suffix}`)) {
      return {
        ok: false,
        code: 'WRONG_TYPE',
        userMessage: suffix === 'rehabilitation' ? '개인회생 사건이 아닙니다.' : '개인파산 사건이 아닙니다.',
      };
    }
  }

  return { ok: true, auth, caseRow: caseRow as unknown as T };
}
