import { NextResponse } from 'next/server';
import { getCurrentAuth, getPlatformOrganizationContextId, hasActivePlatformAdminView } from '@/lib/auth';
import { containsSensitiveData, hashForAudit, maskSensitiveText, sanitizeAiText } from '@/lib/ai/guardrails';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { guardAccessDeniedResponse, guardServerErrorResponse, guardValidationFailedResponse } from '@/lib/api-guard-response';

const ALLOWED_FEATURES = new Set([
  'home_ai_assistant',
  'ai_summary_card',
  'next_action_recommendation',
  'draft_assist',
  'anomaly_alert',
  'admin_copilot'
]);

const ALLOWED_STATUSES = new Set(['접수', '분석중', '조치완료']);

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

  const body = await request.json().catch(() => ({}));
  const organizationId = String(body.organizationId || '').trim();
  const aiFeature = String(body.aiFeature || '').trim();
  const screen = sanitizeAiText(String(body.screen || '').trim());
  const question = String(body.question || '').trim();
  const answer = String(body.answer || '').trim();
  const rationale = String(body.rationale || '').trim();
  const modelVersion = sanitizeAiText(String(body.modelVersion || '').trim());
  const requestId = sanitizeAiText(String(body.requestId || '').trim());
  const reason = sanitizeAiText(String(body.reason || '').trim());
  const status = ALLOWED_STATUSES.has(String(body.status || '').trim()) ? String(body.status).trim() : '접수';

  if (!organizationId || !aiFeature || !screen || !reason) {
    return guardValidationFailedResponse(400, {
      blocked: '오답 신고가 차단되었습니다.',
      cause: 'organizationId, aiFeature, screen, reason 중 필수 항목이 누락되었습니다.',
      resolution: '필수 항목을 채운 뒤 다시 시도해 주세요.'
    });
  }

  if (!ALLOWED_FEATURES.has(aiFeature)) {
    return guardValidationFailedResponse(400, {
      blocked: '오답 신고가 차단되었습니다.',
      cause: '허용되지 않은 AI 기능 식별자입니다.',
      resolution: '정의된 기능 식별자로 다시 시도해 주세요.'
    });
  }

  const hasMembership = auth.memberships.some((membership) => membership.organization_id === organizationId);
  const isPlatformAdmin = await hasActivePlatformAdminView(auth, getPlatformOrganizationContextId(auth));
  if (!hasMembership && !isPlatformAdmin) {
    return guardAccessDeniedResponse(403, {
      blocked: '오답 신고가 차단되었습니다.',
      cause: '현재 조직 멤버십 또는 플랫폼 관리자 권한이 확인되지 않았습니다.',
      resolution: '권한 없음'
    });
  }

  const maskedQuestion = maskSensitiveText(question);
  const maskedAnswer = maskSensitiveText(answer);
  const maskedRationale = maskSensitiveText(rationale);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('audit_logs').insert({
    actor_id: auth.user.id,
    action: 'ai.feedback.reported',
    resource_type: 'ai_feedback',
    resource_id: requestId || `${aiFeature}:${Date.now()}`,
    organization_id: organizationId,
    meta: {
      ai_feature: aiFeature,
      status,
      screen,
      user_role: auth.profile.platform_role,
      reason,
      model_version: modelVersion || null,
      request_id: requestId || null,
      question_masked: maskedQuestion || null,
      answer_masked: maskedAnswer || null,
      rationale_masked: maskedRationale || null,
      question_hash: question ? hashForAudit(question) : null,
      answer_hash: answer ? hashForAudit(answer) : null,
      rationale_hash: rationale ? hashForAudit(rationale) : null,
      pii_detected: [question, answer, rationale].some((v) => containsSensitiveData(v)),
      created_at: new Date().toISOString()
    }
  });

  if (error) {
    return guardServerErrorResponse(500, '오답 신고 저장에 실패했습니다.');
  }

  return NextResponse.json({ ok: true, status: '접수' });
}

