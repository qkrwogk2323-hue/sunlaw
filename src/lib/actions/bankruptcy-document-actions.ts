'use server';

import { revalidatePath } from 'next/cache';
import { checkCaseActionAccess } from '@/lib/case-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  generateBankruptcyDocument,
  type BankruptcyDocumentType,
  type BankruptcyDocumentData,
} from '@/lib/bankruptcy/document-generator';
import { persistGeneratedDocument } from '@/lib/documents/persistence';

/**
 * 개인파산 문서 생성 서버 액션
 *
 * rehabilitation_applications 테이블의 신청인/대리인 정보와
 * insolvency_creditors 테이블의 채권자 데이터를 조합하여
 * 파산·면책 절차 법원 제출 문서를 생성합니다.
 */
// 파산 모듈은 전 문서가 법원 제출용이라 persistence 실패 시 전체 실패.
const BANKRUPTCY_SUBMISSION_DOC_TYPES: ReadonlySet<BankruptcyDocumentType> = new Set([
  'petition',
  'delegation',
  'creditor_list',
  'property_list',
  'income_statement',
  'affidavit',
]);

export type GenerateBankruptcyDocumentResult =
  | { ok: true; persisted: true; html: string; documentId: string; storagePath: string }
  | { ok: true; persisted: false; html: string; persistenceWarning: string }
  | { ok: false; code: string; userMessage: string };

export async function generateBankruptcyDoc(
  caseId: string,
  organizationId: string,
  documentType: BankruptcyDocumentType,
): Promise<GenerateBankruptcyDocumentResult> {
  try {
    const access = await checkCaseActionAccess(caseId, { organizationId, insolvencySubtypePrefix: 'bankruptcy' });
    if (!access.ok) return access;

    const supabase = await createSupabaseServerClient();

    // 병렬 데이터 조회
    const [
      applicationRes,
      caseRes,
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

      // 사건 기본 정보 (법원명, 사건번호)
      supabase
        .from('cases')
        .select('court_name, case_number, title')
        .eq('id', caseId)
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

    // 사건 테이블의 법원명·사건번호를 application에 병합
    const caseInfo = caseRes.data;
    const mergedApplication = {
      ...((applicationRes.data as Record<string, any>) || {}),
      ...(caseInfo?.court_name ? { court_name: caseInfo.court_name } : {}),
      ...(caseInfo?.case_number ? { case_number: caseInfo.case_number } : {}),
    };

    const docData: BankruptcyDocumentData = {
      application: mergedApplication as Record<string, any>,
      creditors: ((creditorsRes.data ?? []) as BankruptcyDocumentData['creditors']),
      properties: (propertiesRes.data ?? []) as Record<string, any>[],
      propertyDeductions: (propertyDeductionsRes.data ?? []) as Record<string, any>[],
      familyMembers: (familyRes.data ?? []) as Record<string, any>[],
      incomeSettings: (incomeRes.data as Record<string, any>) || null,
      affidavit: (affidavitRes.data as Record<string, any>) || null,
    };

    const html = generateBankruptcyDocument(documentType, docData);

    const title = `${caseInfo?.title ?? '개인파산'} — ${documentType}`;
    const persisted = await persistGeneratedDocument({
      supabase,
      caseId,
      organizationId,
      actorId: access.auth.user.id,
      actorName: access.auth.profile?.full_name ?? null,
      sourceKind: 'bankruptcy',
      sourceDocumentType: documentType,
      title,
      html,
      sourceDataSnapshot: docData,
    });

    if (!persisted.ok) {
      const isSubmission = BANKRUPTCY_SUBMISSION_DOC_TYPES.has(documentType);
      console.warn('[generateBankruptcyDoc] persistence failed:', {
        documentType,
        isSubmission,
        code: persisted.code,
      });
      if (isSubmission) {
        return {
          ok: false,
          code: 'PERSIST_REQUIRED',
          userMessage: `제출용 문서(${documentType})는 사건 문서함 기록이 필수입니다. 저장에 실패하여 생성을 취소했습니다. 잠시 후 다시 시도하거나 관리자에게 문의해 주세요.`,
        };
      }
      return {
        ok: true,
        persisted: false,
        html,
        persistenceWarning: persisted.userMessage,
      };
    }

    return {
      ok: true,
      persisted: true,
      html,
      documentId: persisted.documentId,
      storagePath: persisted.storagePath,
    };
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
    const access = await checkCaseActionAccess(caseId, { organizationId, insolvencySubtypePrefix: 'bankruptcy' });
    if (!access.ok) return access;
    const auth = access.auth;

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
