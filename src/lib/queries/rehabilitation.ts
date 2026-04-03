/**
 * 개인회생 모듈 쿼리
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';

/** DB → 폼 필드 역매핑 (신청서) */
function mapApplicationDbToForm(row: Record<string, unknown>) {
  const addr = (row.registered_address as Record<string, string>) || {};
  return {
    ...row,
    // 폼에서 사용하는 필드명으로 매핑
    resident_front: row.resident_number_front || '',
    resident_back: '', // 해시값은 폼에 노출하지 않음
    phone: row.phone_mobile || '',
    address: addr.address || '',
    detail_address: addr.detail || '',
    postal_code: addr.postal_code || '',
    email: row.agent_email || '',
    occupation: row.position || '',
    employer_phone: row.phone_home || '',
    employment_start_date: row.work_period || '',
    filing_date: row.application_date || '',
    filing_purpose: '원금균등변제',
  };
}

/** 개인회생 신청서 기본 정보 조회 */
export async function getRehabApplication(caseId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('rehabilitation_applications')
    .select('*')
    .eq('case_id', caseId)
    .maybeSingle();
  return data ? mapApplicationDbToForm(data as Record<string, unknown>) : null;
}

/** 채권자 설정 조회 */
export async function getRehabCreditorSettings(caseId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('rehabilitation_creditor_settings')
    .select('*')
    .eq('case_id', caseId)
    .maybeSingle();
  return data;
}

/** 채권자 목록 조회 (soft delete 제외) */
export async function getRehabCreditors(caseId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('rehabilitation_creditors')
    .select('*')
    .eq('case_id', caseId)
    .is('deleted_at', null)
    .order('bond_number')
    .limit(200);
  return data ?? [];
}

/** 별제권 담보물건 목록 조회 */
export async function getRehabSecuredProperties(caseId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('rehabilitation_secured_properties')
    .select('*')
    .eq('case_id', caseId)
    .is('deleted_at', null)
    .order('created_at')
    .limit(100);
  return data ?? [];
}

/** 재산 목록 조회 */
export async function getRehabProperties(caseId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('rehabilitation_properties')
    .select('*')
    .eq('case_id', caseId)
    .is('deleted_at', null)
    .order('category, created_at')
    .limit(500);
  return data ?? [];
}

/** 재산 공제 항목 조회 */
export async function getRehabPropertyDeductions(caseId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('rehabilitation_property_deductions')
    .select('*')
    .eq('case_id', caseId)
    .limit(50);
  return data ?? [];
}

/** 가족 구성원 목록 조회 */
export async function getRehabFamilyMembers(caseId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('rehabilitation_family_members')
    .select('*')
    .eq('case_id', caseId)
    .is('deleted_at', null)
    .order('created_at')
    .limit(20);
  return data ?? [];
}

/** 소득 설정 조회 */
export async function getRehabIncomeSettings(caseId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('rehabilitation_income_settings')
    .select('*')
    .eq('case_id', caseId)
    .maybeSingle();
  return data;
}

/** 진술서 조회 */
export async function getRehabAffidavit(caseId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('rehabilitation_affidavits')
    .select('*')
    .eq('case_id', caseId)
    .maybeSingle();
  return data;
}

/** 변제계획 섹션 목록 조회 */
export async function getRehabPlanSections(caseId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('rehabilitation_plan_sections')
    .select('*')
    .eq('case_id', caseId)
    .order('section_order')
    .limit(50);
  return data ?? [];
}

/** 개인회생 모듈 전체 데이터 병렬 조회 */
export async function getRehabModuleData(caseId: string) {
  const [
    application,
    creditorSettings,
    creditors,
    securedProperties,
    properties,
    propertyDeductions,
    familyMembers,
    incomeSettings,
    affidavit,
    planSections,
  ] = await Promise.all([
    getRehabApplication(caseId),
    getRehabCreditorSettings(caseId),
    getRehabCreditors(caseId),
    getRehabSecuredProperties(caseId),
    getRehabProperties(caseId),
    getRehabPropertyDeductions(caseId),
    getRehabFamilyMembers(caseId),
    getRehabIncomeSettings(caseId),
    getRehabAffidavit(caseId),
    getRehabPlanSections(caseId),
  ]);

  return {
    application,
    creditorSettings,
    creditors,
    securedProperties,
    properties,
    propertyDeductions,
    familyMembers,
    incomeSettings,
    affidavit,
    planSections,
  };
}
