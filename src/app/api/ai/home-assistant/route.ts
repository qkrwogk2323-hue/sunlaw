import { NextResponse } from 'next/server';
import { getCurrentAuth, getEffectiveOrganizationId, getPlatformOrganizationContextId, hasActivePlatformAdminView } from '@/lib/auth';
import { answerDashboardAssistant } from '@/lib/ai/dashboard-home';
import { getAiFeaturePolicy } from '@/lib/ai/feature-catalog';
import { sanitizeAiText } from '@/lib/ai/guardrails';
import { guardAccessDeniedResponse, guardServerErrorResponse, guardValidationFailedResponse } from '@/lib/api-guard-response';
import { getDashboardSnapshot } from '@/lib/queries/dashboard';

export async function POST(request: Request) {
  const auth = await getCurrentAuth();
  if (!auth) {
    return guardAccessDeniedResponse(401, {
      code: 'AUTH_REQUIRED',
      blocked: 'AI 도우미 요청이 차단되었습니다.',
      cause: '로그인 세션이 없거나 만료되었습니다.',
      resolution: '다시 로그인한 뒤 요청을 재시도해 주세요.'
    });
  }

  const body = await request.json().catch(() => ({}));
  const organizationId = String(body.organizationId || getEffectiveOrganizationId(auth) || '').trim();
  const question = sanitizeAiText(String(body.question || '').trim());

  if (!organizationId || !question) {
    return guardValidationFailedResponse(400, {
      blocked: 'AI 도우미 요청이 차단되었습니다.',
      cause: '조직 정보 또는 질문 내용이 비어 있습니다.',
      resolution: '질문을 입력한 뒤 다시 시도해 주세요.'
    });
  }

  const hasMembership = auth.memberships.some((membership) => membership.organization_id === organizationId);
  const isPlatformAdmin = await hasActivePlatformAdminView(auth, getPlatformOrganizationContextId(auth));
  if (!hasMembership && !isPlatformAdmin) {
    return guardAccessDeniedResponse(403, {
      blocked: 'AI 도우미 요청이 차단되었습니다.',
      cause: '현재 조직에 대한 접근 권한이 확인되지 않았습니다.',
      resolution: '권한 없음'
    });
  }

  try {
    const snapshot = await getDashboardSnapshot(organizationId);
    const response = answerDashboardAssistant({
      organizationId,
      question,
      snapshot,
      isPlatformAdmin
    });

    return NextResponse.json({
      ok: true,
      requestId: `home-ai:${Date.now()}`,
      area: getAiFeaturePolicy('home_ai_assistant').areaId,
      featureLabel: getAiFeaturePolicy('home_ai_assistant').label,
      ...response
    });
  } catch {
    return guardServerErrorResponse(500, 'AI 도우미 답변을 만들지 못했습니다.');
  }
}
