'use server';

import { revalidatePath } from 'next/cache';
import { requireOrganizationActionAccess } from '@/lib/auth';
import { checkCaseActionAccess } from '@/lib/case-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// ─── 채권자 저장 (AI 추출 결과 → DB) ───────────────────────────────────────────

export type SaveCreditorsInput = {
  organizationId: string;
  caseId: string;
  jobId: string;
  creditors: Array<{
    creditorName: string;
    claimClass: 'secured' | 'priority' | 'general';
    principalAmount: number;
    interestAmount: number;
    penaltyAmount: number;
    interestRatePct: number | null;
    hasGuarantor: boolean;
    guarantorName: string | null;
    collateralDescription: string | null;
    prioritySubtype: string | null;
    sourcePageReference: string | null;
    aiConfidenceScore: number;
  }>;
};

// AI 추출 결과에서 채권자 목록을 저장한다.
export async function saveCreditorsFromExtraction(input: SaveCreditorsInput) {
  const { auth } = await requireOrganizationActionAccess(input.organizationId, {
    permission: 'case_edit'
  });

  const caseAccess = await checkCaseActionAccess(input.caseId, { organizationId: input.organizationId });
  if (!caseAccess.ok) return caseAccess;

  const supabase = await createSupabaseServerClient();

  const rows = input.creditors.map((c) => ({
    organization_id: input.organizationId,
    case_id: input.caseId,
    ingestion_job_id: input.jobId,
    creditor_name: c.creditorName,
    creditor_type: 'financial_institution' as const,
    claim_class: c.claimClass,
    principal_amount: c.principalAmount,
    interest_amount: c.interestAmount,
    penalty_amount: c.penaltyAmount,
    interest_rate_pct: c.interestRatePct,
    has_guarantor: c.hasGuarantor,
    guarantor_name: c.guarantorName,
    ai_extracted: true,
    ai_confidence_score: c.aiConfidenceScore,
    source_page_reference: c.sourcePageReference,
    is_confirmed: false,
    lifecycle_status: 'active',
    created_by: auth.user.id,
    updated_by: auth.user.id
  }));

  const { error } = await supabase.from('insolvency_creditors').insert(rows);
  if (error) {
    return { ok: false as const, code: 'DB_ERROR', userMessage: error.code === '23505' ? '이미 동일한 채권자 정보가 등록되어 있습니다.' : '채권자 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.' };
  }

  revalidatePath(`/cases/${input.caseId}/bankruptcy`);
  return { ok: true as const };
}

// ─── 채권자 수동 수정 ─────────────────────────────────────────────────────────

// 단일 채권자 정보를 수정한다.
export async function updateCreditor(
  creditorId: string,
  organizationId: string,
  caseId: string,
  data: {
    creditorName?: string;
    claimClass?: 'secured' | 'priority' | 'general';
    principalAmount?: number;
    interestAmount?: number;
    penaltyAmount?: number;
    isConfirmed?: boolean;
    notes?: string;
  }
) {
  const { auth } = await requireOrganizationActionAccess(organizationId, { permission: 'case_edit' });
  const caseAccess = await checkCaseActionAccess(caseId, { organizationId });
  if (!caseAccess.ok) return caseAccess;

  const supabase = await createSupabaseServerClient();

  const updateData: Record<string, unknown> = { ...data, updated_by: auth.user.id };
  if (data.isConfirmed) {
    updateData.is_confirmed = true;
    updateData.confirmed_by = auth.user.id;
    updateData.confirmed_at = new Date().toISOString();
  }
  // snake_case 변환
  if ('creditorName' in data) { updateData.creditor_name = data.creditorName; delete updateData.creditorName; }
  if ('claimClass' in data) { updateData.claim_class = data.claimClass; delete updateData.claimClass; }
  if ('principalAmount' in data) { updateData.principal_amount = data.principalAmount; delete updateData.principalAmount; }
  if ('interestAmount' in data) { updateData.interest_amount = data.interestAmount; delete updateData.interestAmount; }
  if ('penaltyAmount' in data) { updateData.penalty_amount = data.penaltyAmount; delete updateData.penaltyAmount; }
  if ('isConfirmed' in data) { delete updateData.isConfirmed; }

  const { error } = await supabase
    .from('insolvency_creditors')
    .update(updateData)
    .eq('id', creditorId)
    .eq('organization_id', organizationId);

  if (error) {
    return { ok: false as const, code: 'DB_ERROR', userMessage: '채권자 정보 수정에 실패했습니다. 해당 채권자가 이미 삭제됐거나 수정 권한이 없을 수 있습니다.' };
  }

  revalidatePath(`/cases/${caseId}/bankruptcy`);
  return { ok: true as const };
}

// ─── 채권자 soft delete ───────────────────────────────────────────────────────

// 채권자를 소프트 삭제 상태로 전환한다.
export async function softDeleteCreditor(creditorId: string, organizationId: string, caseId: string) {
  const { auth } = await requireOrganizationActionAccess(organizationId, { permission: 'case_edit' });
  const caseAccess = await checkCaseActionAccess(caseId, { organizationId });
  if (!caseAccess.ok) return caseAccess;

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('insolvency_creditors')
    .update({
      lifecycle_status: 'soft_deleted',
      deleted_at: new Date().toISOString(),
      updated_by: auth.user.id
    })
    .eq('id', creditorId)
    .eq('organization_id', organizationId);

  if (error) {
    return { ok: false as const, code: 'DB_ERROR', userMessage: '채권자 삭제에 실패했습니다. 해당 채권자가 이미 삭제됐거나 삭제 권한이 없을 수 있습니다.' };
  }

  revalidatePath(`/cases/${caseId}/bankruptcy`);
  return { ok: true as const };
}

// ─── 변제계획 생성/저장 (allocations 포함 전체 버전) ──────────────────────────

// 변제계획 전체 스냅샷을 저장한다.
export async function saveRepaymentPlanFull(input: {
  organizationId: string;
  caseId: string;
  insolvencySubtype: string;
  repaymentMonths: 36 | 60;
  monthlyIncome: number;
  monthlyLivingCost: number;
  planStartDate: string;
  totalSecuredClaim: number;
  totalPriorityClaim: number;
  totalGeneralClaim: number;
  totalRepaymentAmount: number;
  generalRepaymentPool: number;
  generalRepaymentRatePct: number;
  allocations: Array<{
    creditorId: string;
    creditorName: string;
    claimClass: 'secured' | 'priority' | 'general';
    originalAmount: number;
    allocatedAmount: number;
    allocationRatePct: number;
  }>;
}) {
  const { auth } = await requireOrganizationActionAccess(input.organizationId, { permission: 'case_edit' });
  const caseAccess = await checkCaseActionAccess(input.caseId, { organizationId: input.organizationId });
  if (!caseAccess.ok) return caseAccess;

  const supabase = await createSupabaseServerClient();

  const { count } = await supabase
    .from('insolvency_repayment_plans')
    .select('id', { count: 'exact', head: true })
    .eq('case_id', input.caseId);

  const versionNumber = (count ?? 0) + 1;

  const startDate = new Date(input.planStartDate);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + input.repaymentMonths);

  const { data: plan, error: planError } = await supabase
    .from('insolvency_repayment_plans')
    .insert({
      organization_id: input.organizationId,
      case_id: input.caseId,
      version_number: versionNumber,
      status: 'draft',
      insolvency_subtype: input.insolvencySubtype,
      repayment_months: input.repaymentMonths,
      plan_start_date: input.planStartDate,
      plan_end_date: endDate.toISOString().split('T')[0],
      monthly_income: input.monthlyIncome,
      monthly_living_cost: input.monthlyLivingCost,
      total_secured_claim: input.totalSecuredClaim,
      total_priority_claim: input.totalPriorityClaim,
      total_general_claim: input.totalGeneralClaim,
      total_repayment_amount: input.totalRepaymentAmount,
      general_repayment_pool: input.generalRepaymentPool,
      general_repayment_rate_pct: input.generalRepaymentRatePct,
      created_by: auth.user.id,
      updated_by: auth.user.id
    })
    .select('id')
    .single();

  if (planError || !plan) {
    return { ok: false as const, code: 'DB_ERROR', userMessage: '변제계획 저장에 실패했습니다.' };
  }

  if (input.allocations.length > 0) {
    const allocRows = input.allocations.map((a, idx) => ({
      plan_id: plan.id,
      creditor_id: a.creditorId,
      creditor_name: a.creditorName,
      claim_class: a.claimClass,
      original_amount: Math.round(a.originalAmount),
      allocated_amount: Math.round(a.allocatedAmount),
      allocation_rate_pct: Math.round(a.allocationRatePct * 10000) / 10000,
      allocation_order: idx + 1
    }));
    const { error: allocError } = await supabase.from('insolvency_repayment_allocations').insert(allocRows);
    if (allocError) {
      return { ok: false as const, code: 'DB_ERROR', userMessage: '안분비례 저장에 실패했습니다.' };
    }
  }

  revalidatePath(`/cases/${input.caseId}/bankruptcy`);
  return { ok: true as const, planId: plan.id, versionNumber };
}

// ─── 의뢰인 액션패킷 생성 (M08) ───────────────────────────────────────────────

// 의뢰인 액션 패킷을 생성한다.
export async function createClientActionPacket(input: {
  organizationId: string;
  caseId: string;
  title: string;
  dueDate?: string;
  notes?: string;
  items: Array<{
    title: string;
    description: string | null;
    responsibility: 'client_self' | 'client_visit' | 'office_prepare';
    displayOrder: number;
    aiExtracted?: boolean;
  }>;
}) {
  const { auth } = await requireOrganizationActionAccess(input.organizationId, { permission: 'case_edit' });
  const caseAccess = await checkCaseActionAccess(input.caseId, { organizationId: input.organizationId });
  if (!caseAccess.ok) return caseAccess;

  const supabase = await createSupabaseServerClient();

  const { data: packet, error: packetError } = await supabase
    .from('insolvency_client_action_packets')
    .insert({
      organization_id: input.organizationId,
      case_id: input.caseId,
      title: input.title,
      status: 'pending',
      due_date: input.dueDate ?? null,
      notes: input.notes ?? null,
      total_count: input.items.length,
      completed_count: 0,
      created_by: auth.user.id,
      updated_by: auth.user.id
    })
    .select('id')
    .single();

  if (packetError || !packet) {
    return { ok: false as const, code: 'DB_ERROR', userMessage: '패킷 생성에 실패했습니다.' };
  }

  if (input.items.length > 0) {
    const itemRows = input.items.map((item) => ({
      packet_id: packet.id,
      organization_id: input.organizationId,
      case_id: input.caseId,
      title: item.title,
      description: item.description,
      responsibility: item.responsibility,
      display_order: item.displayOrder,
      ai_extracted: item.aiExtracted ?? false,
      is_completed: false
    }));
    const { error: itemsError } = await supabase.from('insolvency_client_action_items').insert(itemRows);
    if (itemsError) {
      return { ok: false as const, code: 'DB_ERROR', userMessage: '항목 저장에 실패했습니다.' };
    }
  }

  revalidatePath(`/cases/${input.caseId}/bankruptcy`);
  return { ok: true as const, packetId: packet.id };
}

// ─── 의뢰인 액션아이템 확인 처리 (클라이언트 포털용) ──────────────────────────

// 의뢰인 액션 패킷 항목의 완료 상태를 바꾼다.
export async function checkClientActionItem(
  itemId: string,
  caseId: string,
  organizationId: string,
  clientNote?: string
) {
  const { auth } = await requireOrganizationActionAccess(organizationId, {});
  const caseAccess = await checkCaseActionAccess(caseId, { organizationId });
  if (!caseAccess.ok) return caseAccess;

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('insolvency_client_action_items')
    .update({
      client_checked_at: new Date().toISOString(),
      client_checked_by: auth.user.id,
      client_note: clientNote ?? null,
      is_completed: true,
      completed_at: new Date().toISOString()
    })
    .eq('id', itemId)
    .eq('case_id', caseId);

  if (error) {
    return { ok: false as const, code: 'DB_ERROR', userMessage: '항목 처리에 실패했습니다.' };
  }

  // 패킷 completed_count 갱신 (RPC 없으면 무시)
  try {
    await supabase.rpc('refresh_action_packet_count', { p_item_id: itemId }).maybeSingle();
  } catch { /* RPC 없으면 skip */ }

  revalidatePath(`/cases/${caseId}/bankruptcy`);
  return { ok: true as const };
}

// ─── 변제계획 생성/저장 (기본 버전) ───────────────────────────────────────────

// 간이 변제계획 저장 요청을 처리한다.
export async function saveRepaymentPlan(input: {
  organizationId: string;
  caseId: string;
  insolvencySubtype: string;
  repaymentMonths: 36 | 60;
  monthlyIncome: number;
  monthlyLivingCost: number;
  planStartDate: string;
  totalSecuredClaim: number;
  totalPriorityClaim: number;
  totalGeneralClaim: number;
  totalRepaymentAmount: number;
  generalRepaymentPool: number;
  generalRepaymentRatePct: number;
}) {
  const { auth } = await requireOrganizationActionAccess(input.organizationId, { permission: 'case_edit' });
  const caseAccess = await checkCaseActionAccess(input.caseId, { organizationId: input.organizationId });
  if (!caseAccess.ok) return caseAccess;

  const supabase = await createSupabaseServerClient();

  // 버전 번호 계산
  const { count } = await supabase
    .from('insolvency_repayment_plans')
    .select('id', { count: 'exact', head: true })
    .eq('case_id', input.caseId);

  const versionNumber = (count ?? 0) + 1;

  const startDate = new Date(input.planStartDate);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + input.repaymentMonths);

  const { data: plan, error } = await supabase
    .from('insolvency_repayment_plans')
    .insert({
      organization_id: input.organizationId,
      case_id: input.caseId,
      version_number: versionNumber,
      status: 'draft',
      insolvency_subtype: input.insolvencySubtype,
      repayment_months: input.repaymentMonths,
      plan_start_date: input.planStartDate,
      plan_end_date: endDate.toISOString().split('T')[0],
      monthly_income: input.monthlyIncome,
      monthly_living_cost: input.monthlyLivingCost,
      total_secured_claim: input.totalSecuredClaim,
      total_priority_claim: input.totalPriorityClaim,
      total_general_claim: input.totalGeneralClaim,
      total_repayment_amount: input.totalRepaymentAmount,
      general_repayment_pool: input.generalRepaymentPool,
      general_repayment_rate_pct: input.generalRepaymentRatePct,
      created_by: auth.user.id,
      updated_by: auth.user.id
    })
    .select('id')
    .single();

  if (error || !plan) {
    return { ok: false as const, code: 'DB_ERROR', userMessage: '변제계획 저장에 실패했습니다.' };
  }

  revalidatePath(`/cases/${input.caseId}/bankruptcy`);
  return { ok: true as const, planId: plan.id, versionNumber };
}
