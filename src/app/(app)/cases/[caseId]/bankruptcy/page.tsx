import { notFound } from 'next/navigation';
import { findMembership } from '@/lib/auth';
import { requireCaseAccess } from '@/lib/case-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { BankruptcyModuleClient } from './bankruptcy-module-client';
import type { CorrectionChecklistItemRaw, CorrectionNoticeSummaryRaw } from '@/lib/insolvency-types';

interface Props {
  params: Promise<{ caseId: string }>;
}

export default async function BankruptcyPage({ params }: Props) {
  const { caseId } = await params;

  const { auth, caseRow } = await requireCaseAccess<{
    id: string;
    title: string;
    case_type: string | null;
    insolvency_subtype: string | null;
    organization_id: string;
    module_flags: Record<string, unknown> | null;
    lifecycle_status?: string | null;
  }>(caseId, {
    select: 'id, title, case_type, insolvency_subtype, organization_id, module_flags, lifecycle_status',
    insolvencySubtypePrefix: 'bankruptcy',
  });

  const membership = findMembership(auth, caseRow.organization_id);
  if (!membership) notFound();

  const supabase = await createSupabaseServerClient();

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

  // 담보물 목록 (별제권부 M04)
  const { data: collaterals } = await supabase
    .from('insolvency_collaterals')
    .select('id, creditor_id, collateral_type, estimated_value, secured_claim_amount, real_estate_address, vehicle_model')
    .eq('case_id', caseId)
    .neq('lifecycle_status', 'soft_deleted');

  // 법적 한도 상수
  const { data: rulesetConstants } = await supabase
    .from('insolvency_ruleset_constants')
    .select('ruleset_key, display_name, value_amount, value_pct')
    .order('effective_from', { ascending: false });

  // 의뢰인 액션패킷 + 항목 (M08)
  const { data: packets } = await supabase
    .from('insolvency_client_action_packets')
    .select('id, title, status, due_date, completed_count, total_count, created_at, insolvency_client_action_items(id, title, description, responsibility, display_order, client_checked_at, staff_verified_at, is_completed, ai_extracted, client_note)')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });

  // 최근 AI 추출된 보정항목 (correction_recommendation/order 문서에서 추출된 것)
  const { data: latestJob } = await supabase
    .from('document_ingestion_jobs')
    .select('id, extracted_json, processing_completed_at')
    .eq('case_id', caseId)
    .in('document_type', ['correction_recommendation', 'correction_order'])
    .eq('status', 'completed')
    .order('processing_completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const extractedJson = (latestJob?.extracted_json ?? null) as {
    correctionItems?: CorrectionChecklistItemRaw[];
    correctionNoticeSummary?: CorrectionNoticeSummaryRaw | null;
  } | null;
  const correctionItemsFromAI = extractedJson?.correctionItems ?? [];
  const correctionNoticeSummaryFromAI = extractedJson?.correctionNoticeSummary ?? null;

  return (
    <BankruptcyModuleClient
      caseId={caseId}
      organizationId={caseRow.organization_id}
      caseTitle={caseRow.title}
      insolvencySubtype={caseRow.insolvency_subtype}
      creditors={creditors ?? []}
      latestPlan={latestPlan}
      memberRole={membership.role}
      collaterals={collaterals ?? []}
      rulesetConstants={rulesetConstants ?? []}
      packets={(packets ?? []).map((p) => ({ ...p, items: p.insolvency_client_action_items ?? [] }))}
      correctionItemsFromAI={correctionItemsFromAI}
      correctionNoticeSummaryFromAI={correctionNoticeSummaryFromAI}
    />
  );
}
