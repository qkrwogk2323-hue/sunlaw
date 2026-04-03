'use server';

import { revalidatePath } from 'next/cache';
import { requireAuthenticatedUser, findMembership } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// ─── 폼 → DB 필드 매핑 (신청서) ───

function mapApplicationFormToDb(form: Record<string, unknown>) {
  return {
    applicant_name: form.applicant_name || null,
    resident_number_front: form.resident_front || null,
    resident_number_hash: form.resident_back || null,
    phone_mobile: form.phone || null,
    registered_address: {
      address: form.address || '',
      detail: form.detail_address || '',
      postal_code: form.postal_code || '',
    },
    employer_name: form.employer_name || null,
    position: form.occupation || null,
    work_period: form.employment_start_date || null,
    court_name: form.court_name || null,
    application_date: form.filing_date || null,
    agent_email: form.email || null,
    phone_home: form.employer_phone || null,
  };
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

    if (creditorId) {
      const { error } = await supabase
        .from('rehabilitation_creditors')
        .update({ ...creditorData, updated_at: new Date().toISOString() })
        .eq('id', creditorId)
        .eq('case_id', caseId);
      if (error) return { ok: false, code: 'DB_ERROR', userMessage: '채권자 수정에 실패했습니다.' };
    } else {
      // 다음 bond_number 계산
      const { data: maxRow } = await supabase
        .from('rehabilitation_creditors')
        .select('bond_number')
        .eq('case_id', caseId)
        .is('deleted_at', null)
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
          ...creditorData,
        });
      if (error) return { ok: false, code: 'DB_ERROR', userMessage: '채권자 추가에 실패했습니다.' };
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
      .update({ deleted_at: new Date().toISOString() })
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
      .update({ deleted_at: new Date().toISOString() })
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
      .update({ deleted_at: new Date().toISOString() })
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
