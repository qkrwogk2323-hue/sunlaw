import { NextResponse } from 'next/server';
import { getCurrentAuth, getEffectiveOrganizationId, getPlatformOrganizationContextId, hasActivePlatformAdminView } from '@/lib/auth';
import { buildDraftAssist } from '@/lib/ai/dashboard-home';
import { getAiFeaturePolicy } from '@/lib/ai/feature-catalog';
import { sanitizeAiText } from '@/lib/ai/guardrails';
import { guardAccessDeniedResponse, guardValidationFailedResponse } from '@/lib/api-guard-response';

const ALLOWED_KINDS = new Set(['organization_message', 'hub_message', 'client_invite', 'staff_invite']);

export async function POST(request: Request) {
  const auth = await getCurrentAuth();
  if (!auth) {
    return guardAccessDeniedResponse(401, {
      code: 'AUTH_REQUIRED',
      blocked: '작성 보조 요청이 차단되었습니다.',
      cause: '로그인 세션이 없거나 만료되었습니다.',
      resolution: '다시 로그인한 뒤 요청을 재시도해 주세요.'
    });
  }

  const body = await request.json().catch(() => ({}));
  const organizationId = String(body.organizationId || getEffectiveOrganizationId(auth) || '').trim();
  const kind = String(body.kind || '').trim();
  const prompt = sanitizeAiText(String(body.prompt || '').trim());
  const contextTitle = sanitizeAiText(String(body.contextTitle || '').trim());

  if (!organizationId || !ALLOWED_KINDS.has(kind) || !prompt) {
    return guardValidationFailedResponse(400, {
      blocked: '작성 보조 요청이 차단되었습니다.',
      cause: '조직, 작성 유형, 요청 내용 중 하나가 비어 있거나 올바르지 않습니다.',
      resolution: '유형과 요청 내용을 확인한 뒤 다시 시도해 주세요.'
    });
  }

  const hasMembership = auth.memberships.some((membership) => membership.organization_id === organizationId);
  const isPlatformAdmin = await hasActivePlatformAdminView(auth, getPlatformOrganizationContextId(auth));
  if (!hasMembership && !isPlatformAdmin) {
    return guardAccessDeniedResponse(403, {
      blocked: '작성 보조 요청이 차단되었습니다.',
      cause: '현재 조직에 대한 접근 권한이 확인되지 않았습니다.',
      resolution: '권한 없음'
    });
  }

  const response = buildDraftAssist({
    kind: kind as 'organization_message' | 'hub_message' | 'client_invite' | 'staff_invite',
    prompt,
    contextTitle: contextTitle || null
  });

  return NextResponse.json({
    ok: true,
    requestId: `draft-assist:${Date.now()}`,
    area: getAiFeaturePolicy('draft_assist').areaId,
    featureLabel: getAiFeaturePolicy('draft_assist').label,
    ...response
  });
}
