import { NextResponse } from 'next/server';
import { getCurrentAuth, getPlatformOrganizationContextId, hasActivePlatformAdminView } from '@/lib/auth';
import { runAdminCopilot } from '@/lib/ai/dashboard-home';
import { sanitizeAiText } from '@/lib/ai/guardrails';
import { guardAccessDeniedResponse, guardServerErrorResponse, guardValidationFailedResponse } from '@/lib/api-guard-response';

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

  try {
    const response = await runAdminCopilot({ question });
    return NextResponse.json({
      ok: true,
      requestId: `admin-copilot:${Date.now()}`,
      ...response
    });
  } catch {
    return guardServerErrorResponse(500, '운영 도우미 답변을 만들지 못했습니다.');
  }
}
