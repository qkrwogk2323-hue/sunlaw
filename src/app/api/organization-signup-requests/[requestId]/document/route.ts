import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentAuth, getPlatformOrganizationContextId, hasActivePlatformAdminView } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { guardAccessDeniedResponse, guardConditionFailedResponse, guardServerErrorResponse } from '@/lib/api-guard-response';

const organizationSignupDocumentBucket = 'organization-signup-documents';

function sanitizeDownloadFileName(fileName: string) {
  const normalized = fileName.trim().replace(/[\r\n"]/g, '');
  return normalized || 'organization-signup-document';
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  const auth = await getCurrentAuth();

  if (!auth) {
    return guardAccessDeniedResponse(401, {
      code: 'AUTH_REQUIRED',
      blocked: '인증이 필요해 문서 다운로드가 차단되었습니다.',
      cause: '로그인 세션이 없거나 만료되었습니다.',
      resolution: '다시 로그인한 뒤 문서를 다시 열어 주세요.'
    });
  }

  const { requestId } = await params;
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const { data: requestRow } = await supabase
    .from('organization_signup_requests')
    .select('id, requester_profile_id, business_registration_document_path, business_registration_document_name, business_registration_document_mime_type')
    .eq('id', requestId)
    .maybeSingle();

  if (!requestRow?.business_registration_document_path) {
    return guardConditionFailedResponse(404, {
      blocked: '사업자등록 문서 다운로드가 차단되었습니다.',
      cause: '요청 문서가 존재하지 않거나 이미 삭제되었습니다.',
      resolution: '신청 내역에서 문서 업로드 상태를 확인해 주세요.'
    });
  }

  const isPlatformAdmin = await hasActivePlatformAdminView(auth, getPlatformOrganizationContextId(auth));
  if (!isPlatformAdmin && requestRow.requester_profile_id !== auth.user.id) {
    return guardAccessDeniedResponse(403, {
      blocked: '사업자등록 문서 다운로드가 차단되었습니다.',
      cause: '요청자 본인 또는 플랫폼 관리자 권한이 확인되지 않았습니다.',
      resolution: '본인 계정으로 다시 로그인하거나 권한 승인을 요청해 주세요.'
    });
  }

  const { data, error } = await admin.storage
    .from(organizationSignupDocumentBucket)
    .download(requestRow.business_registration_document_path);

  if (error || !data) {
    return guardServerErrorResponse(500, '문서 다운로드 처리 중 문제가 발생해 요청이 차단되었습니다.');
  }

  const fileBytes = new Uint8Array(await data.arrayBuffer());
  const fileName = sanitizeDownloadFileName(requestRow.business_registration_document_name ?? 'organization-signup-document');

  return new NextResponse(fileBytes, {
    status: 200,
    headers: {
      'Content-Type': requestRow.business_registration_document_mime_type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
