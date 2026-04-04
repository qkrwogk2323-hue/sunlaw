'use server';

import { revalidatePath } from 'next/cache';
import { requireAuthenticatedUser, findMembership } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  generateBankruptcyDocument,
  type BankruptcyDocumentType,
  type BankruptcyDocumentData,
} from '@/lib/bankruptcy/document-generator';

/**
 * 개인파산 문서 생성 서버 액션
 *
 * rehabilitation_applications 테이블의 신청인/대리인 정보와
 * insolvency_creditors 테이블의 채권자 데이터를 조합하여
 * 파산·면책 절차 법원 제출 문서를 생성합니다.
 */
export async function generateBankruptcyDoc(
  caseId: string,
  organizationId: string,
  documentType: BankruptcyDocumentType,
): Promise<{ ok: true; html: string } | { ok: false; code: string; userMessage: string }> {
  try {
    const auth = await requireAuthenticatedUser();
    const membership = findMembership(auth, organizationId);
    if (!membership) return { ok: false, code: 'NO_ACCESS', userMessage: '접근 권한이 없습니다.' };

    const supabase = await createSupabaseServerClient();

    // 병렬 데이터 조회
    const [
      applicationRes,
      creditorsRes,
      propertiesRes,
      propertyDeductionsRes,
      familyRes,
      incomeRes,
      affidavitRes,
    ] = await Promise.all([
      // 신청인/대리인 정보 (rehabilitation_applications 재사용)
      supabase
        .from('rehabilitation_applications')
        .select('*')
        .eq('case_id', caseId)
        .maybeSingle(),

      // 채권자 목록 (insolvency_creditors 사용)
      supabase
        .from('insolvency_creditors')
        .select('creditor_name, claim_class, principal_amount, interest_amount, penalty_amount, total_claim_amount, has_guarantor, guarantor_name, notes')
        .eq('case_id', caseId)
        .neq('lifecycle_status', 'soft_deleted')
        .order('claim_class')
        .order('created_at'),

      // 재산 목록 (rehabilitation_properties 재사용)
      supabase
        .from('rehabilitation_properties')
        .select('*')
        .eq('case_id', caseId)
        .neq('lifecycle_status', 'soft_deleted')
        .order('sort_order'),

      // 재산 공제
      supabase
        .from('rehabilitation_property_deductions')
        .select('*')
        .eq('case_id', caseId),

      // 가족관계
      supabase
        .from('rehabilitation_family_members')
        .select('*')
        .eq('case_id', caseId)
        .neq('lifecycle_status', 'soft_deleted')
        .order('sort_order'),

      // 수입지출
      supabase
        .from('rehabilitation_income_settings')
        .select('*')
        .eq('case_id', caseId)
        .maybeSingle(),

      // 진술서
      supabase
        .from('rehabilitation_affidavits')
        .select('*')
        .eq('case_id', caseId)
        .maybeSingle(),
    ]);

    const docData: BankruptcyDocumentData = {
      application: (applicationRes.data as Record<string, any>) || null,
      creditors: ((creditorsRes.data ?? []) as BankruptcyDocumentData['creditors']),
      properties: (propertiesRes.data ?? []) as Record<string, any>[],
      propertyDeductions: (propertyDeductionsRes.data ?? []) as Record<string, any>[],
      familyMembers: (familyRes.data ?? []) as Record<string, any>[],
      incomeSettings: (incomeRes.data as Record<string, any>) || null,
      affidavit: (affidavitRes.data as Record<string, any>) || null,
    };

    const html = generateBankruptcyDocument(documentType, docData);
    return { ok: true, html };
  } catch (e) {
    console.error('[generateBankruptcyDoc]', e);
    return { ok: false, code: 'UNEXPECTED', userMessage: '문서 생성 중 오류가 발생했습니다.' };
  }
}

/**
 * 개인파산 사건의 신청인/대리인 정보를 upsert
 * (rehabilitation_applications 테이블 재사용)
 */
export async function upsertBankruptcyApplication(
  caseId: string,
  organizationId: string,
  data: Record<string, unknown>,
) {
  try {
    const auth = await requireAuthenticatedUser();
    const membership = findMembership(auth, organizationId);
    if (!membership) return { ok: false, code: 'NO_ACCESS', userMessage: '접근 권한이 없습니다.' };

    const supabase = await createSupabaseServerClient();

    // 주소 jsonb 헬퍼
    const addr = (prefix: string) => ({
      address: (data[`${prefix}_address`] as string) || '',
      detail: (data[`${prefix}_detail`] as string) || '',
      postal_code: (data[`${prefix}_postal_code`] as string) || '',
    });

    const dbData: Record<string, unknown> = {
      applicant_name: data.applicant_name || null,
      resident_number_front: data.resident_front || null,
      resident_number_hash: data.resident_back || null,
      phone_mobile: data.phone || null,
      phone_home: data.phone_home || null,
      registered_address: addr('reg'),
      current_address: addr('cur'),
      office_address: addr('off'),
      service_address: addr('svc'),
      service_recipient: data.service_recipient || null,
      return_account: data.return_account || null,
      income_type: data.income_type || null,
      employer_name: data.employer_name || null,
      position: data.occupation || null,
      work_period: data.employment_start_date || null,
      court_name: data.court_name || null,
      case_number: data.case_number || null,
      application_date: data.filing_date || null,
      agent_type: data.agent_type || null,
      agent_name: data.agent_name || null,
      agent_phone: data.agent_phone || null,
      agent_email: data.agent_email_addr || data.email || null,
      agent_fax: data.agent_fax || null,
      agent_address: addr('agt'),
    };

    // 기존 데이터 확인
    const { data: existing } = await supabase
      .from('rehabilitation_applications')
      .select('id')
      .eq('case_id', caseId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('rehabilitation_applications')
        .update({ ...dbData, updated_by: auth.user.id })
        .eq('id', existing.id);
      if (error) return { ok: false, code: 'DB_ERROR', userMessage: '저장에 실패했습니다.' };
    } else {
      const { error } = await supabase
        .from('rehabilitation_applications')
        .insert({
          ...dbData,
          case_id: caseId,
          organization_id: organizationId,
          created_by: auth.user.id,
          updated_by: auth.user.id,
        });
      if (error) return { ok: false, code: 'DB_ERROR', userMessage: '저장에 실패했습니다.' };
    }

    revalidatePath(`/cases/${caseId}/bankruptcy`);
    return { ok: true };
  } catch (e) {
    console.error('[upsertBankruptcyApplication]', e);
    return { ok: false, code: 'UNEXPECTED', userMessage: '저장 중 오류가 발생했습니다.' };
  }
}
