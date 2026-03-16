'use server';

import { revalidatePath } from 'next/cache';
import { requireOrganizationActionAccess } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { collectionCompensationPlanSchema, orgSettlementSchema } from '@/lib/validators';

async function loadCollectionContext(caseId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: caseRecord, error } = await supabase
    .from('cases')
    .select('id, organization_id, title')
    .eq('id', caseId)
    .single();

  if (error || !caseRecord) throw error ?? new Error('사건을 찾을 수 없습니다.');
  return { supabase, caseRecord };
}

export async function addCollectionCompensationPlanAction(formData: FormData) {
  const parsed = collectionCompensationPlanSchema.parse({
    caseId: formData.get('caseId'),
    targetKind: formData.get('targetKind'),
    beneficiaryMembershipId: formData.get('beneficiaryMembershipId'),
    beneficiaryCaseOrganizationId: formData.get('beneficiaryCaseOrganizationId'),
    title: formData.get('title'),
    description: formData.get('description'),
    settlementCycle: formData.get('settlementCycle') || 'monthly',
    fixedAmount: formData.get('fixedAmount') || undefined,
    rate: formData.get('rate') || undefined,
    baseMetric: formData.get('baseMetric'),
    effectiveFrom: formData.get('effectiveFrom'),
    ruleJson: formData.get('ruleJson')
  });

  const { supabase, caseRecord } = await loadCollectionContext(parsed.caseId);
  const { auth } = await requireOrganizationActionAccess(caseRecord.organization_id, {
    permission: 'collection_compensation_manage_plan',
    errorMessage: '보수 규칙 관리 권한이 없습니다.'
  });

  let ruleJson: Record<string, unknown> = {};
  if (parsed.ruleJson) {
    try {
      ruleJson = JSON.parse(parsed.ruleJson);
    } catch {
      throw new Error('보수 규칙 JSON 형식이 올바르지 않습니다.');
    }
  }

  const { error } = await supabase.rpc('create_collection_compensation_plan_atomic', {
    p_case_id: parsed.caseId,
    p_organization_id: caseRecord.organization_id,
    p_target_kind: parsed.targetKind,
    p_beneficiary_membership_id: parsed.beneficiaryMembershipId || null,
    p_beneficiary_case_organization_id: parsed.beneficiaryCaseOrganizationId || null,
    p_title: parsed.title,
    p_description: parsed.description || null,
    p_settlement_cycle: parsed.settlementCycle,
    p_fixed_amount: parsed.fixedAmount ?? null,
    p_rate: parsed.rate ?? null,
    p_base_metric: parsed.baseMetric || null,
    p_effective_from: parsed.effectiveFrom || null,
    p_rule_json: ruleJson
  });

  if (error) throw error;

  revalidatePath('/collections');
}

export async function addOrgSettlementEntryAction(formData: FormData) {
  const parsed = orgSettlementSchema.parse({
    caseId: formData.get('caseId'),
    sourceCaseOrganizationId: formData.get('sourceCaseOrganizationId'),
    targetCaseOrganizationId: formData.get('targetCaseOrganizationId'),
    title: formData.get('title'),
    description: formData.get('description'),
    amount: formData.get('amount') || 0,
    dueOn: formData.get('dueOn')
  });

  const supabase = await createSupabaseServerClient();
  const { data: sourceOrg, error } = await supabase
    .from('case_organizations')
    .select('organization_id, case_id')
    .eq('id', parsed.sourceCaseOrganizationId)
    .single();
  if (error || !sourceOrg) throw error ?? new Error('정산 원천 조직을 찾을 수 없습니다.');

  const { auth } = await requireOrganizationActionAccess(sourceOrg.organization_id, {
    permission: 'settlement_manage',
    errorMessage: '정산 관리 권한이 없습니다.'
  });

  const { error: insertError } = await supabase.from('org_settlement_entries').insert({
    case_id: parsed.caseId || sourceOrg.case_id,
    source_case_organization_id: parsed.sourceCaseOrganizationId,
    target_case_organization_id: parsed.targetCaseOrganizationId,
    title: parsed.title,
    description: parsed.description || null,
    amount: parsed.amount,
    due_on: parsed.dueOn || null,
    created_by: auth.user.id,
    updated_by: auth.user.id
  });

  if (insertError) throw insertError;

  revalidatePath('/collections');
}
