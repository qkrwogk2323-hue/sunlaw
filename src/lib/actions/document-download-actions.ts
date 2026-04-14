'use server';

import { checkCaseActionAccess } from '@/lib/case-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createGeneratedDocumentDownloadUrl } from '@/lib/documents/persistence';

/**
 * case_documents row의 저장된 아티팩트에 대해 임시 서명 다운로드 URL을 발급한다.
 *
 * 사용 흐름:
 *   1) UI가 generateRehabDocument / generateBankruptcyDoc을 호출해 document를 생성
 *   2) 서버 액션이 case_documents 행을 만들고 documentId를 반환
 *   3) UI가 getGeneratedDocumentDownloadUrl(documentId)로 서명 URL을 받아 다운로드
 *   4) 같은 문서를 재다운로드할 때는 1~2 없이 3만 호출
 *
 * 보안: case_documents의 case_id로 checkCaseActionAccess를 거쳐 RLS와 scope 정책을
 * 앱 레벨에서 한 번 더 검증.
 */
export async function getGeneratedDocumentDownloadUrl(
  documentId: string,
): Promise<{ ok: true; url: string } | { ok: false; code: string; userMessage: string }> {
  try {
    if (!documentId) {
      return { ok: false, code: 'VALIDATION', userMessage: '문서 ID가 없습니다.' };
    }

    const supabase = await createSupabaseServerClient();
    const { data: doc } = await supabase
      .from('case_documents')
      .select('id, case_id, organization_id, storage_path, source_kind')
      .eq('id', documentId)
      .maybeSingle();

    if (!doc || !doc.storage_path) {
      return { ok: false, code: 'NOT_FOUND', userMessage: '문서 또는 파일 경로를 찾을 수 없습니다.' };
    }

    const access = await checkCaseActionAccess(doc.case_id, { organizationId: doc.organization_id });
    if (!access.ok) return access;

    const signed = await createGeneratedDocumentDownloadUrl(doc.storage_path, 300);
    if (!signed.ok) {
      return { ok: false, code: 'STORAGE_ERROR', userMessage: signed.userMessage };
    }

    return { ok: true, url: signed.url };
  } catch (e) {
    console.error('[getGeneratedDocumentDownloadUrl]', e);
    return { ok: false, code: 'UNEXPECTED', userMessage: '다운로드 링크 생성 중 오류가 발생했습니다.' };
  }
}
