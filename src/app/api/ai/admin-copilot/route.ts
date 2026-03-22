import { getCurrentAuth, getPlatformOrganizationContextId, hasActivePlatformAdminView } from '@/lib/auth';
import { sanitizeAiText } from '@/lib/ai/guardrails';
import { guardAccessDeniedResponse, guardValidationFailedResponse } from '@/lib/api-guard-response';

export async function POST(request: Request) {
  const auth = await getCurrentAuth();
  if (!auth) {
    return guardAccessDeniedResponse(401, {
      code: 'AUTH_REQUIRED',
      blocked: '운영 도우미 요청이 차단되었습니다.',
      cause: '로그인 세션이 없거나 만료되었습니다.',
      resolution: '다시 로그인한 뒤 요청을 재시도해 주세요.'
    });
  }

  const isPlatformAdmin = await hasActivePlatformAdminView(auth, getPlatformOrganizationContextId(auth));
  if (!isPlatformAdmin) {
    return guardAccessDeniedResponse(403, {
      blocked: '운영 도우미 요청이 차단되었습니다.',
      cause: '플랫폼 운영 권한이 확인되지 않았습니다.',
      resolution: '권한 없음'
    });
  }

  const body = await request.json().catch(() => ({}));
  const question = sanitizeAiText(String(body.question || '').trim());
  if (!question) {
    return guardValidationFailedResponse(400, {
      blocked: '운영 도우미 요청이 차단되었습니다.',
      cause: '질문이 비어 있습니다.',
      resolution: '질문을 입력한 뒤 다시 시도해 주세요.'
    });
  }

  void question;
  return guardAccessDeniedResponse(403, {
    code: 'PLATFORM_AI_DISABLED',
    blocked: '플랫폼 운영 관련 AI 답변은 제공하지 않습니다.',
    cause: '조직 승인, 구독 조정, 운영 판단 같은 플랫폼 업무는 AI가 답하거나 제안하지 않습니다.',
    resolution: '플랫폼 운영 메뉴에서 직접 확인해 주세요.'
  });
}
