/**
 * 개인회생 모듈 쿼리
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';

/** DB → 폼 필드 역매핑 (신청서) */
function mapApplicationDbToForm(row: Record<string, unknown>) {
  // ─── 주소 jsonb 파싱 헬퍼 ───
  const parseAddr = (raw: unknown) => {
    if (!raw || typeof raw !== 'object') return { address: '', detail: '', postal_code: '' };
    const obj = raw as Record<string, string>;
    return { address: obj.address || '', detail: obj.detail || '', postal_code: obj.postal_code || '' };
  };

  const regAddr = parseAddr(row.registered_address);
  const curAddr = parseAddr(row.current_address);
  const offAddr = parseAddr(row.office_address);
  const svcAddr = parseAddr(row.service_address);
  const agtAddr = parseAddr(row.agent_address);

  return {
    ...row,
    // 인적사항
    resident_front: row.resident_number_front || '',
    resident_back: '', // 해시값은 폼에 노출하지 않음
    phone: row.phone_mobile || '',
    phone_home: row.phone_home || '',
    email: row.agent_email || '',

    // 주민등록상 주소
    reg_address: regAddr.address,
    reg_detail: regAddr.detail,
    reg_postal_code: regAddr.postal_code,
    // 하위호환
    address: regAddr.address,
    detail_address: regAddr.detail,
    postal_code: regAddr.postal_code,

    // 현주소
    cur_address: curAddr.address,
    cur_detail: curAddr.detail,
    cur_postal_code: curAddr.postal_code,

    // 직장주소
    off_address: offAddr.address,
    off_detail: offAddr.detail,
    off_postal_code: offAddr.postal_code,

    // 송달주소
    svc_address: svcAddr.address,
    svc_detail: svcAddr.detail,
    svc_postal_code: svcAddr.postal_code,

    // 대리인 주소
    agt_address: agtAddr.address,
    agt_detail: agtAddr.detail,
    agt_postal_code: agtAddr.postal_code,
    agent_email_addr: row.agent_email || '',

    // 소득/직업
    occupation: row.position || '',
    employer_phone: row.phone_home || '',
    employment_start_date: row.work_period || '',

    // 신청
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

/** DB → 폼 필드 역매핑 (채권자 설정) */
function mapCreditorSettingsDbToForm(row: Record<string, unknown>) {
  return {
    ...row,
    base_date: row.list_date || '',
  };
}

/** 채권자 설정 조회 */
export async function getRehabCreditorSettings(caseId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('rehabilitation_creditor_settings')
    .select('*')
    .eq('case_id', caseId)
    .maybeSingle();
  return data ? mapCreditorSettingsDbToForm(data as Record<string, unknown>) : null;
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

/** DB → 폼 필드 역매핑 (소득 설정) */
function mapIncomeDbToForm(row: Record<string, unknown>) {
  return {
    ...row,
    income_year: row.median_income_year || new Date().getFullYear(),
    monthly_income: row.net_salary || 0,
  };
}

/** 소득 설정 조회 */
export async function getRehabIncomeSettings(caseId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('rehabilitation_income_settings')
    .select('*')
    .eq('case_id', caseId)
    .maybeSingle();
  return data ? mapIncomeDbToForm(data as Record<string, unknown>) : null;
}

/** DB → 폼 필드 역매핑 (진술서) */
function mapAffidavitDbToForm(row: Record<string, unknown>) {
  const repayFeasibility = (row.repay_feasibility as string) || '';
  const parts = repayFeasibility.split('\n\n');
  return {
    ...row,
    debt_reason: row.debt_history || '',
    debt_increase_reason: row.property_change || '',
    repay_effort: row.income_change || '',
    current_situation: row.living_situation || '',
    future_plan: parts[0] || '',
    reflection: parts.slice(1).join('\n\n') || '',
  };
}

/** 진술서 조회 */
export async function getRehabAffidavit(caseId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('rehabilitation_affidavits')
    .select('*')
    .eq('case_id', caseId)
    .maybeSingle();
  return data ? mapAffidavitDbToForm(data as Record<string, unknown>) : null;
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
