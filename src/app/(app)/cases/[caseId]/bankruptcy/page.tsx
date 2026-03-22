import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { BankruptcyModuleClient } from './bankruptcy-module-client';

interface Props {
  params: Promise<{ caseId: string }>;
}

export default async function BankruptcyPage({ params }: Props) {
  const { caseId } = await params;
  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();

  // 사건 기본 정보
  const { data: caseRow } = await supabase
    .from('cases')
    .select('id, title, case_type, insolvency_subtype, organization_id, module_flags')
    .eq('id', caseId)
    .single();

  if (!caseRow) notFound();

  // 조직 멤버 확인
  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('role')
    .eq('organization_id', caseRow.organization_id)
    .eq('profile_id', auth.user.id)
    .eq('status', 'active')
    .single();

  if (!membership) notFound();

  // 채권자 목록 (soft delete 제외)
  const { data: creditors } = await supabase
    .from('insolvency_creditors')
    .select('id, creditor_name, creditor_type, claim_class, principal_amount, interest_amount, penalty_amount, total_claim_amount, interest_rate_pct, has_guarantor, guarantor_name, ai_extracted, ai_confidence_score, is_confirmed, notes, source_page_reference')
    .eq('case_id', caseId)
    .neq('lifecycle_status', 'soft_deleted')
    .order('claim_class')
    .order('created_at');

  // 최근 변제계획
  const { data: latestPlan } = await supabase
    .from('insolvency_repayment_plans')
    .select('id, version_number, status, repayment_months, monthly_income, monthly_living_cost, monthly_disposable, total_claim_amount, total_repayment_amount, general_repayment_rate_pct, plan_start_date, plan_end_date, created_at')
    .eq('case_id', caseId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <BankruptcyModuleClient
      caseId={caseId}
      organizationId={caseRow.organization_id}
      caseTitle={caseRow.title}
      insolvencySubtype={caseRow.insolvency_subtype}
      creditors={creditors ?? []}
      latestPlan={latestPlan}
      memberRole={membership.role}
    />
  );
}
