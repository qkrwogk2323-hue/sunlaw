'use server';

import { revalidatePath } from 'next/cache';
import { requireAuthenticatedUser, findMembership } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { generateDocument, type DocumentType, type DocumentData } from '@/lib/rehabilitation/document-generator';
import { getRehabModuleData } from '@/lib/queries/rehabilitation';

// ─── 폼 → DB 필드 매핑 (신청서) ───

function mapApplicationFormToDb(form: Record<string, unknown>) {
  // ─── 주소 jsonb 헬퍼 ───
  const addr = (prefix: string) => ({
    address: (form[`${prefix}_address`] as string) || '',
    detail: (form[`${prefix}_detail`] as string) || '',
    postal_code: (form[`${prefix}_postal_code`] as string) || '',
  });

  const mapped: Record<string, unknown> = {
    // 인적사항
    applicant_name: form.applicant_name || null,
    resident_number_front: form.resident_front || null,
    resident_number_hash: form.resident_back || null,
    phone_mobile: form.phone || null,
    phone_home: form.phone_home || null,

    // 주소 (4종)
    registered_address: addr('reg'),
    current_address: addr('cur'),
    office_address: addr('off'),
    service_address: addr('svc'),
    service_recipient: form.service_recipient || null,

    // 반환계좌
    return_account: form.return_account || null,

    // 소득/직업
    income_type: form.income_type || null,
    employer_name: form.employer_name || null,
    position: form.occupation || null,
    work_period: form.employment_start_date || null,
    has_extra_income: form.has_extra_income ?? false,
    extra_income_name: form.extra_income_name || null,
    extra_income_source: form.extra_income_source || null,

    // 신청/사건
    court_name: form.court_name || null,
    court_detail: form.court_detail || null,
    judge_division: form.judge_division || null,
    case_year: form.case_year || null,
    case_number: form.case_number || null,
    application_date: form.filing_date || null,
    repayment_start_date: form.repayment_start_date || null,
    repayment_start_uncertain: form.repayment_start_uncertain ?? false,
    repayment_start_day: form.repayment_start_day || 0,

    // 개인회생위원 계좌
    trustee_bank_name: form.trustee_bank_name || null,
    trustee_bank_account: form.trustee_bank_account || null,

    // 대리인
    agent_type: form.agent_type || null,
    agent_name: form.agent_name || null,
    agent_phone: form.agent_phone || null,
    agent_email: form.agent_email_addr || form.email || null,
    agent_fax: form.agent_fax || null,
    agent_address: addr('agt'),

    // 문서 옵션
    info_request_form: form.info_request_form ?? false,
    ecourt_agreement: form.ecourt_agreement ?? false,
    delegation_form: form.delegation_form ?? false,
  };

  return mapped;
}

// ─── 신청서 (Application) ───

export async function upsertRehabApplication(
  caseId: string,
  organizationId: string,
  data: Record<string, unknown>,
) {
  try {
    const auth = await requireAuthenticatedUser();
    const membership = findMembership(auth, organizationId);
    if (!membership) return { ok: false, code: 'NO_ACCESS', userMessage: '접근 권한이 없습니다.' };

    const supabase = await createSupabaseServerClient();
    const dbData = mapApplicationFormToDb(data);

    // 기존 데이터 확인
    const { data: existing } = await supabase
      .from('rehabilitation_applications')
      .select('id')
      .eq('case_id', caseId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('rehabilitation_applications')
        .update({ ...dbData, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) {
        console.error('[upsertRehabApplication] update error:', error);
        return { ok: false, code: 'DB_ERROR', userMessage: '신청서 저장에 실패했습니다.' };
      }
    } else {
      const { error } = await supabase
        .from('rehabilitation_applications')
        .insert({
          case_id: caseId,
          organization_id: organizationId,
          ...dbData,
        });
      if (error) {
        console.error('[upsertRehabApplication] insert error:', error);
        return { ok: false, code: 'DB_ERROR', userMessage: '신청서 생성에 실패했습니다.' };
      }
    }

    revalidatePath(`/cases/${caseId}/rehabilitation`);
    return { ok: true };
  } catch (e) {
    console.error('[upsertRehabApplication]', e);
    return { ok: false, code: 'UNEXPECTED', userMessage: '신청서 저장 중 오류가 발생했습니다.' };
  }
}

// ─── 채권자 설정 (폼→DB 매핑) ───

function mapCreditorSettingsFormToDb(form: Record<string, unknown>) {
  return {
    list_date: form.base_date || null,
    bond_date: form.bond_date || null,
    repay_type: form.repay_type || 'sequential',
    summary_table: form.summary_table ?? false,
    copy_with_evidence: form.copy_with_evidence ?? false,
  };
}

export async function upsertRehabCreditorSettings(
  caseId: string,
  organizationId: string,
  data: Record<string, unknown>,
) {
  try {
    const auth = await requireAuthenticatedUser();
    const membership = findMembership(auth, organizationId);
    if (!membership) return { ok: false, code: 'NO_ACCESS', userMessage: '접근 권한이 없습니다.' };

    const supabase = await createSupabaseServerClient();
    const dbData = mapCreditorSettingsFormToDb(data);

    const { data: existing } = await supabase
      .from('rehabilitation_creditor_settings')
      .select('id')
      .eq('case_id', caseId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('rehabilitation_creditor_settings')
        .update({ ...dbData, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) { console.error('[upsertRehabCreditorSettings]', error); return { ok: false, code: 'DB_ERROR', userMessage: '채권자 설정 저장에 실패했습니다.' }; }
    } else {
      const { error } = await supabase
        .from('rehabilitation_creditor_settings')
        .insert({ case_id: caseId, ...dbData });
      if (error) { console.error('[upsertRehabCreditorSettings]', error); return { ok: false, code: 'DB_ERROR', userMessage: '채권자 설정 생성에 실패했습니다.' }; }
    }

    revalidatePath(`/cases/${caseId}/rehabilitation`);
    return { ok: true };
  } catch (e) {
    console.error('[upsertRehabCreditorSettings]', e);
    return { ok: false, code: 'UNEXPECTED', userMessage: '채권자 설정 저장 중 오류가 발생했습니다.' };
  }
}

// ─── 채권자 CRUD ───

export async function upsertRehabCreditor(
  caseId: string,
  organizationId: string,
  creditorData: Record<string, unknown>,
  creditorId?: string,
) {
  try {
    const auth = await requireAuthenticatedUser();
    const membership = findMembership(auth, organizationId);
    if (!membership) return { ok: false, code: 'NO_ACCESS', userMessage: '접근 권한이 없습니다.' };

    const supabase = await createSupabaseServerClient();

    // 클라이언트 전용 필드 및 무효 id 제거
    const { id: _formId, bond_number: _bn, ...cleanData } = creditorData as Record<string, unknown> & { id?: string; bond_number?: number };

    if (creditorId) {
      const { error } = await supabase
        .from('rehabilitation_creditors')
        .update({ ...cleanData, updated_at: new Date().toISOString() })
        .eq('id', creditorId)
        .eq('case_id', caseId);
      if (error) {
        console.error('[upsertRehabCreditor] update error', error);
        return { ok: false, code: 'DB_ERROR', userMessage: '채권자 수정에 실패했습니다.' };
      }
    } else {
      // 다음 bond_number 계산
      const { data: maxRow } = await supabase
        .from('rehabilitation_creditors')
        .select('bond_number')
        .eq('case_id', caseId)
        .neq('lifecycle_status', 'soft_deleted')
        .order('bond_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextBondNumber = (maxRow?.bond_number ?? 0) + 1;

      const { error } = await supabase
        .from('rehabilitation_creditors')
        .insert({
          case_id: caseId,
          organization_id: organizationId,
          bond_number: nextBondNumber,
          ...cleanData,
        });
      if (error) {
        console.error('[upsertRehabCreditor] insert error', error);
        return { ok: false, code: 'DB_ERROR', userMessage: '채권자 추가에 실패했습니다.' };
      }
    }

    revalidatePath(`/cases/${caseId}/rehabilitation`);
    return { ok: true };
  } catch (e) {
    console.error('[upsertRehabCreditor]', e);
    return { ok: false, code: 'UNEXPECTED', userMessage: '채권자 저장 중 오류가 발생했습니다.' };
  }
}

export async function softDeleteRehabCreditor(
  creditorId: string,
  caseId: string,
  organizationId: string,
) {
  try {
    const auth = await requireAuthenticatedUser();
    const membership = findMembership(auth, organizationId);
    if (!membership) return { ok: false, code: 'NO_ACCESS', userMessage: '접근 권한이 없습니다.' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('rehabilitation_creditors')
      .update({ lifecycle_status: 'soft_deleted', updated_at: new Date().toISOString() })
      .eq('id', creditorId)
      .eq('case_id', caseId);

    if (error) return { ok: false, code: 'DB_ERROR', userMessage: '채권자 삭제에 실패했습니다.' };

    revalidatePath(`/cases/${caseId}/rehabilitation`);
    return { ok: true };
  } catch (e) {
    console.error('[softDeleteRehabCreditor]', e);
    return { ok: false, code: 'UNEXPECTED', userMessage: '채권자 삭제 중 오류가 발생했습니다.' };
  }
}

// ─── 별제권 담보물건 ───

export async function upsertRehabSecuredProperty(
  caseId: string,
  organizationId: string,
  data: Record<string, unknown>,
  propertyId?: string,
) {
  try {
    const auth = await requireAuthenticatedUser();
    const membership = findMembership(auth, organizationId);
    if (!membership) return { ok: false, code: 'NO_ACCESS', userMessage: '접근 권한이 없습니다.' };

    const supabase = await createSupabaseServerClient();

    if (propertyId) {
      const { error } = await supabase
        .from('rehabilitation_secured_properties')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', propertyId)
        .eq('case_id', caseId);
      if (error) return { ok: false, code: 'DB_ERROR', userMessage: '담보물건 수정에 실패했습니다.' };
    } else {
      const { error } = await supabase
        .from('rehabilitation_secured_properties')
        .insert({ case_id: caseId, ...data });
      if (error) return { ok: false, code: 'DB_ERROR', userMessage: '담보물건 추가에 실패했습니다.' };
    }

    revalidatePath(`/cases/${caseId}/rehabilitation`);
    return { ok: true };
  } catch (e) {
    console.error('[upsertRehabSecuredProperty]', e);
    return { ok: false, code: 'UNEXPECTED', userMessage: '담보물건 저장 중 오류가 발생했습니다.' };
  }
}

// ─── 재산 CRUD ───

export async function upsertRehabProperty(
  caseId: string,
  organizationId: string,
  data: Record<string, unknown>,
  propertyId?: string,
) {
  try {
    const auth = await requireAuthenticatedUser();
    const membership = findMembership(auth, organizationId);
    if (!membership) return { ok: false, code: 'NO_ACCESS', userMessage: '접근 권한이 없습니다.' };

    const supabase = await createSupabaseServerClient();

    if (propertyId) {
      const { error } = await supabase
        .from('rehabilitation_properties')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', propertyId)
        .eq('case_id', caseId);
      if (error) return { ok: false, code: 'DB_ERROR', userMessage: '재산 수정에 실패했습니다.' };
    } else {
      const { error } = await supabase
        .from('rehabilitation_properties')
        .insert({ case_id: caseId, ...data });
      if (error) return { ok: false, code: 'DB_ERROR', userMessage: '재산 추가에 실패했습니다.' };
    }

    revalidatePath(`/cases/${caseId}/rehabilitation`);
    return { ok: true };
  } catch (e) {
    console.error('[upsertRehabProperty]', e);
    return { ok: false, code: 'UNEXPECTED', userMessage: '재산 저장 중 오류가 발생했습니다.' };
  }
}

export async function softDeleteRehabProperty(
  propertyId: string,
  caseId: string,
  organizationId: string,
) {
  try {
    const auth = await requireAuthenticatedUser();
    const membership = findMembership(auth, organizationId);
    if (!membership) return { ok: false, code: 'NO_ACCESS', userMessage: '접근 권한이 없습니다.' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('rehabilitation_properties')
      .update({ lifecycle_status: 'soft_deleted', updated_at: new Date().toISOString() })
      .eq('id', propertyId)
      .eq('case_id', caseId);

    if (error) return { ok: false, code: 'DB_ERROR', userMessage: '재산 삭제에 실패했습니다.' };

    revalidatePath(`/cases/${caseId}/rehabilitation`);
    return { ok: true };
  } catch (e) {
    console.error('[softDeleteRehabProperty]', e);
    return { ok: false, code: 'UNEXPECTED', userMessage: '재산 삭제 중 오류가 발생했습니다.' };
  }
}

// ─── 가족 구성원 ───

export async function upsertRehabFamilyMember(
  caseId: string,
  organizationId: string,
  data: Record<string, unknown>,
  memberId?: string,
) {
  try {
    const auth = await requireAuthenticatedUser();
    const membership = findMembership(auth, organizationId);
    if (!membership) return { ok: false, code: 'NO_ACCESS', userMessage: '접근 권한이 없습니다.' };

    const supabase = await createSupabaseServerClient();

    if (memberId) {
      const { error } = await supabase
        .from('rehabilitation_family_members')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', memberId)
        .eq('case_id', caseId);
      if (error) return { ok: false, code: 'DB_ERROR', userMessage: '가족 정보 수정에 실패했습니다.' };
    } else {
      const { error } = await supabase
        .from('rehabilitation_family_members')
        .insert({ case_id: caseId, ...data });
      if (error) return { ok: false, code: 'DB_ERROR', userMessage: '가족 정보 추가에 실패했습니다.' };
    }

    revalidatePath(`/cases/${caseId}/rehabilitation`);
    return { ok: true };
  } catch (e) {
    console.error('[upsertRehabFamilyMember]', e);
    return { ok: false, code: 'UNEXPECTED', userMessage: '가족 정보 저장 중 오류가 발생했습니다.' };
  }
}

export async function softDeleteRehabFamilyMember(
  memberId: string,
  caseId: string,
  organizationId: string,
) {
  try {
    const auth = await requireAuthenticatedUser();
    const membership = findMembership(auth, organizationId);
    if (!membership) return { ok: false, code: 'NO_ACCESS', userMessage: '접근 권한이 없습니다.' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('rehabilitation_family_members')
      .update({ lifecycle_status: 'soft_deleted', updated_at: new Date().toISOString() })
      .eq('id', memberId)
      .eq('case_id', caseId);

    if (error) return { ok: false, code: 'DB_ERROR', userMessage: '가족 정보 삭제에 실패했습니다.' };

    revalidatePath(`/cases/${caseId}/rehabilitation`);
    return { ok: true };
  } catch (e) {
    console.error('[softDeleteRehabFamilyMember]', e);
    return { ok: false, code: 'UNEXPECTED', userMessage: '가족 정보 삭제 중 오류가 발생했습니다.' };
  }
}

// ─── 소득 설정 ───

/** 폼 → DB 필드 매핑 (소득 설정) */
function mapIncomeFormToDb(form: Record<string, unknown>) {
  const mapped: Record<string, unknown> = {
    median_income_year: form.income_year ?? new Date().getFullYear(),
    net_salary: form.monthly_income ?? 0,
    living_cost: form.living_cost ?? 0,
    extra_living_cost: form.extra_living_cost ?? 0,
    child_support: form.child_support ?? 0,
    trustee_comm_rate: form.trustee_comm_rate ?? 0,
    dispose_amount: form.dispose_amount ?? 0,
  };
  // dependent_count는 DB 컬럼에 없으므로 제거
  return mapped;
}

export async function upsertRehabIncomeSettings(
  caseId: string,
  organizationId: string,
  data: Record<string, unknown>,
) {
  try {
    const auth = await requireAuthenticatedUser();
    const membership = findMembership(auth, organizationId);
    if (!membership) return { ok: false, code: 'NO_ACCESS', userMessage: '접근 권한이 없습니다.' };

    const supabase = await createSupabaseServerClient();
    const dbData = mapIncomeFormToDb(data);

    const { data: existing } = await supabase
      .from('rehabilitation_income_settings')
      .select('id')
      .eq('case_id', caseId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('rehabilitation_income_settings')
        .update({ ...dbData, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) return { ok: false, code: 'DB_ERROR', userMessage: '소득 설정 저장에 실패했습니다.' };
    } else {
      const { error } = await supabase
        .from('rehabilitation_income_settings')
        .insert({ case_id: caseId, ...dbData });
      if (error) return { ok: false, code: 'DB_ERROR', userMessage: '소득 설정 생성에 실패했습니다.' };
    }

    revalidatePath(`/cases/${caseId}/rehabilitation`);
    return { ok: true };
  } catch (e) {
    console.error('[upsertRehabIncomeSettings]', e);
    return { ok: false, code: 'UNEXPECTED', userMessage: '소득 설정 저장 중 오류가 발생했습니다.' };
  }
}

// ─── 진술서 ───

/** 폼 → DB 필드 매핑 (진술서) */
function mapAffidavitFormToDb(form: Record<string, unknown>) {
  return {
    debt_history: form.debt_reason || null,
    property_change: form.debt_increase_reason || null,
    income_change: form.repay_effort || null,
    living_situation: form.current_situation || null,
    repay_feasibility: [form.future_plan, form.reflection].filter(Boolean).join('\n\n') || null,
  };
}

export async function upsertRehabAffidavit(
  caseId: string,
  organizationId: string,
  data: Record<string, unknown>,
) {
  try {
    const auth = await requireAuthenticatedUser();
    const membership = findMembership(auth, organizationId);
    if (!membership) return { ok: false, code: 'NO_ACCESS', userMessage: '접근 권한이 없습니다.' };

    const supabase = await createSupabaseServerClient();
    const dbData = mapAffidavitFormToDb(data);

    const { data: existing } = await supabase
      .from('rehabilitation_affidavits')
      .select('id')
      .eq('case_id', caseId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('rehabilitation_affidavits')
        .update({ ...dbData, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) return { ok: false, code: 'DB_ERROR', userMessage: '진술서 저장에 실패했습니다.' };
    } else {
      const { error } = await supabase
        .from('rehabilitation_affidavits')
        .insert({ case_id: caseId, ...dbData });
      if (error) return { ok: false, code: 'DB_ERROR', userMessage: '진술서 생성에 실패했습니다.' };
    }

    revalidatePath(`/cases/${caseId}/rehabilitation`);
    return { ok: true };
  } catch (e) {
    console.error('[upsertRehabAffidavit]', e);
    return { ok: false, code: 'UNEXPECTED', userMessage: '진술서 저장 중 오류가 발생했습니다.' };
  }
}

// ─── 재산 공제 ───

export async function upsertRehabPropertyDeduction(
  caseId: string,
  organizationId: string,
  category: string,
  deductionAmount: number,
) {
  try {
    const auth = await requireAuthenticatedUser();
    const membership = findMembership(auth, organizationId);
    if (!membership) return { ok: false, code: 'NO_ACCESS', userMessage: '접근 권한이 없습니다.' };

    const supabase = await createSupabaseServerClient();

    const { data: existing } = await supabase
      .from('rehabilitation_property_deductions')
      .select('id')
      .eq('case_id', caseId)
      .eq('category', category)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('rehabilitation_property_deductions')
        .update({ deduction_amount: deductionAmount, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) return { ok: false, code: 'DB_ERROR', userMessage: '공제 금액 수정에 실패했습니다.' };
    } else {
      const { error } = await supabase
        .from('rehabilitation_property_deductions')
        .insert({ case_id: caseId, category, deduction_amount: deductionAmount });
      if (error) return { ok: false, code: 'DB_ERROR', userMessage: '공제 금액 저장에 실패했습니다.' };
    }

    revalidatePath(`/cases/${caseId}/rehabilitation`);
    return { ok: true };
  } catch (e) {
    console.error('[upsertRehabPropertyDeduction]', e);
    return { ok: false, code: 'UNEXPECTED', userMessage: '공제 금액 저장 중 오류가 발생했습니다.' };
  }
}

// ─── 문서 생성 ───

export async function generateRehabDocument(
  caseId: string,
  organizationId: string,
  documentType: DocumentType,
): Promise<{ ok: true; html: string } | { ok: false; code: string; userMessage: string }> {
  try {
    const auth = await requireAuthenticatedUser();
    const membership = findMembership(auth, organizationId);
    if (!membership) return { ok: false, code: 'NO_ACCESS', userMessage: '접근 권한이 없습니다.' };

    const moduleData = await getRehabModuleData(caseId);

    const docData: DocumentData = {
      application: moduleData.application as Record<string, any> | null,
      creditorSettings: moduleData.creditorSettings as Record<string, any> | null,
      creditors: (moduleData.creditors ?? []) as Record<string, any>[],
      securedProperties: (moduleData.securedProperties ?? []) as Record<string, any>[],
      properties: (moduleData.properties ?? []) as Record<string, any>[],
      propertyDeductions: (moduleData.propertyDeductions ?? []) as Record<string, any>[],
      familyMembers: (moduleData.familyMembers ?? []) as Record<string, any>[],
      incomeSettings: moduleData.incomeSettings as Record<string, any> | null,
      affidavit: moduleData.affidavit as Record<string, any> | null,
      planSections: (moduleData.planSections ?? []) as Record<string, any>[],
    };

    const html = generateDocument(documentType, docData);
    return { ok: true, html };
  } catch (e) {
    console.error('[generateRehabDocument]', e);
    return { ok: false, code: 'UNEXPECTED', userMessage: '문서 생성 중 오류가 발생했습니다.' };
  }
}
