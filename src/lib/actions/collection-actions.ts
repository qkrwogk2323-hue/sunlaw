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

  const { data: collectionOrg } = await supabase
    .from('case_organizations')
    .select('id')
    .eq('case_id', parsed.caseId)
    .eq('organization_id', caseRecord.organization_id)
    .in('role', ['collection_org', 'managing_org'])
    .limit(1)
    .maybeSingle();

  if (!collectionOrg?.id) throw new Error('이 사건에 연결된 추심 조직을 찾을 수 없습니다.');

  const { data: plan, error: planError } = await supabase
    .from('collection_compensation_plans')
    .insert({
      case_id: parsed.caseId,
      collection_org_case_organization_id: collectionOrg.id,
      target_kind: parsed.targetKind,
      beneficiary_membership_id: parsed.beneficiaryMembershipId || null,
      beneficiary_case_organization_id: parsed.beneficiaryCaseOrganizationId || null,
      title: parsed.title,
      description: parsed.description || null,
      settlement_cycle: parsed.settlementCycle,
      created_by: auth.user.id,
      updated_by: auth.user.id
    })
    .select('id')
    .single();

  if (planError || !plan) throw planError ?? new Error('보수 규칙 생성에 실패했습니다.');

  let ruleJson: Record<string, unknown> = {};
  if (parsed.ruleJson) {
    try {
      ruleJson = JSON.parse(parsed.ruleJson);
    } catch {
      throw new Error('보수 규칙 JSON 형식이 올바르지 않습니다.');
    }
  }

  const { error: versionError } = await supabase
    .from('collection_compensation_plan_versions')
    .insert({
      collection_compensation_plan_id: plan.id,
      status: 'draft',
      fixed_amount: parsed.fixedAmount ?? null,
      rate: parsed.rate ?? null,
      base_metric: parsed.baseMetric || null,
      effective_from: parsed.effectiveFrom || null,
      rule_json: ruleJson
    });

  if (versionError) throw versionError;

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
