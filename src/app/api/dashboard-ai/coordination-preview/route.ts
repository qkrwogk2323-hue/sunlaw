import { NextResponse } from 'next/server';
import { getCurrentAuth, getPlatformOrganizationContextId, hasActivePlatformAdminView } from '@/lib/auth';
import { buildAiSourceMeta, containsSensitiveData, sanitizeAiText } from '@/lib/ai/guardrails';
import { buildCoordinationPlan } from '@/lib/ai/task-planner';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { guardAccessDeniedResponse, guardServerErrorResponse, guardValidationFailedResponse } from '@/lib/api-guard-response';

export async function POST(request: Request) {
  const auth = await getCurrentAuth();
  if (!auth) {
    return guardAccessDeniedResponse(401, {
      code: 'AUTH_REQUIRED',
      blocked: '인증이 필요해 요청이 차단되었습니다.',
      cause: '로그인 세션이 없거나 만료되었습니다.',
      resolution: '다시 로그인한 뒤 요청을 재시도해 주세요.'
    });
  }

  const body = await request.json();
  const organizationId = String(body.organizationId || '');
  const content = String(body.content || '').trim();

  if (!organizationId || !content) {
    return guardValidationFailedResponse(400, {
      blocked: '조직 소통 AI 미리보기 요청이 차단되었습니다.',
      cause: 'organizationId 또는 content가 누락되었습니다.',
      resolution: '조직과 입력 내용을 확인한 뒤 다시 시도해 주세요.'
    });
  }

  const hasMembership = auth.memberships.some((membership) => membership.organization_id === organizationId);
  const platformContextId = getPlatformOrganizationContextId(auth);
  const isPlatformAdmin = await hasActivePlatformAdminView(auth, platformContextId);
  if (!hasMembership && !isPlatformAdmin) {
    return guardAccessDeniedResponse(403, {
      blocked: '조직 소통 AI 미리보기 접근이 차단되었습니다.',
      cause: '현재 조직 멤버십 또는 플랫폼 관리자 권한이 확인되지 않았습니다.',
      resolution: '권한 없음'
    });
  }

  if (containsSensitiveData(content)) {
    return guardValidationFailedResponse(400, {
      blocked: '조직 소통 AI 미리보기 요청이 차단되었습니다.',
      cause: '민감정보 패턴이 탐지되어 모델 호출이 차단되었습니다.',
      resolution: '민감정보를 제거한 뒤 다시 시도해 주세요.'
    });
  }

  const supabase = await createSupabaseServerClient();
  const { data: cases, error } = await supabase
    .from('cases')
    .select('id, title')
    .eq('organization_id', organizationId)
    .neq('lifecycle_status', 'soft_deleted')
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) {
    return guardServerErrorResponse(500, '사건 데이터를 조회하지 못해 AI 미리보기가 차단되었습니다.');
  }

  const preview = await buildCoordinationPlan(sanitizeAiText(content), (cases ?? []) as Array<{ id: string; title: string }>);
  const source = buildAiSourceMeta({
    feature: 'home_ai_assistant',
    dataType: 'case_messages + cases',
    scope: { organizationId, caseCount: (cases ?? []).length },
    filters: { lifecycleStatus: '!=soft_deleted', orderBy: 'updated_at desc', limit: 20 }
  });
  return NextResponse.json({ ok: true, preview, source, estimate: preview.provider === 'rules' });
}
