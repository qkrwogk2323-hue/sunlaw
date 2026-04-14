import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';

const CASE_FILES_BUCKET = 'case-files';

export type PersistedDocument = {
  ok: true;
  documentId: string;
  storagePath: string;
};

export type PersistedDocumentError = {
  ok: false;
  code: 'STORAGE_ERROR' | 'DB_ERROR';
  userMessage: string;
};

export type PersistDocumentInput = {
  supabase: SupabaseClient;
  caseId: string;
  organizationId: string;
  actorId: string;
  actorName: string | null;
  sourceKind: 'rehabilitation' | 'bankruptcy';
  sourceDocumentType: string;
  title: string;
  html: string;
  sourceDataSnapshot: unknown;
  mimeType?: string;
};

/**
 * 생성된 HTML 문서를 Supabase Storage에 업로드하고 case_documents 행을 남긴다.
 *
 * - 저장 경로: case-files/{organization_id}/{case_id}/generated/{sourceKind}/{sourceDocumentType}/{timestamp}-{random}.html
 * - case_documents.document_kind는 'other'로 고정 (생성된 문서용 enum 확장 전까지)
 * - 스토리지 업로드는 service_role(admin client)로 수행 → RLS 우회
 * - DB insert는 호출자의 supabase(session) 클라이언트 사용 → RLS 적용
 *
 * 실패 시 호출자에게 { ok: false, ... }를 반환하며, 업로드 성공 후 DB insert 실패 시
 * 스토리지 객체를 best-effort로 삭제한다(orphan 방지).
 */
export async function persistGeneratedDocument(
  input: PersistDocumentInput
): Promise<PersistedDocument | PersistedDocumentError> {
  const {
    supabase,
    caseId,
    organizationId,
    actorId,
    actorName,
    sourceKind,
    sourceDocumentType,
    title,
    html,
    sourceDataSnapshot,
    mimeType = 'text/html;charset=utf-8',
  } = input;

  const admin = createSupabaseAdminClient();

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  const storagePath = `${organizationId}/${caseId}/generated/${sourceKind}/${sourceDocumentType}/${timestamp}-${randomSuffix}.html`;

  const encoded = new TextEncoder().encode(html);

  const { error: uploadError } = await admin.storage
    .from(CASE_FILES_BUCKET)
    .upload(storagePath, encoded, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    console.error('[persistGeneratedDocument] storage upload failed:', uploadError);
    return {
      ok: false,
      code: 'STORAGE_ERROR',
      userMessage: '문서 파일 저장에 실패했습니다.',
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from('case_documents')
    .insert({
      organization_id: organizationId,
      case_id: caseId,
      title,
      document_kind: 'other',
      approval_status: 'draft',
      client_visibility: 'internal_only',
      storage_path: storagePath,
      mime_type: mimeType,
      file_size: encoded.byteLength,
      source_kind: sourceKind,
      source_document_type: sourceDocumentType,
      source_data_snapshot: sourceDataSnapshot ?? null,
      created_by: actorId,
      created_by_name: actorName,
      updated_by: actorId,
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    console.error('[persistGeneratedDocument] case_documents insert failed:', insertError);
    // orphan storage object 제거 (best-effort)
    await admin.storage.from(CASE_FILES_BUCKET).remove([storagePath]).catch(() => undefined);
    return {
      ok: false,
      code: 'DB_ERROR',
      userMessage: '문서 이력 기록에 실패했습니다.',
    };
  }

  return {
    ok: true,
    documentId: inserted.id,
    storagePath,
  };
}

/**
 * 저장된 문서에 대한 임시 서명 URL을 발급한다.
 * UI 재다운로드 경로에서 사용. 만료: 5분.
 */
export async function createGeneratedDocumentDownloadUrl(
  storagePath: string,
  expiresInSeconds: number = 300
): Promise<{ ok: true; url: string } | { ok: false; userMessage: string }> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(CASE_FILES_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    console.error('[createGeneratedDocumentDownloadUrl] signed URL failed:', error);
    return { ok: false, userMessage: '다운로드 링크 생성에 실패했습니다.' };
  }
  return { ok: true, url: data.signedUrl };
}
