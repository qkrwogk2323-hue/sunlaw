import { getCurrentAuth, getPlatformOrganizationContextId, hasActivePlatformAdminView } from '@/lib/auth';
import { guardAccessDeniedResponse, guardValidationFailedResponse } from '@/lib/api-guard-response';
import { getAiFeaturePolicy, type AiAnswerType } from '@/lib/ai/feature-catalog';
import type { AiFeatureId } from '@/lib/ai/guardrails';
import { containsSensitiveData, sanitizeAiText, RESIDENT_RE, CARD_RE, ACCOUNT_RE, TOKEN_RE, API_KEY_RE, SESSION_RE } from '@/lib/ai/guardrails';

export type AiAccessContext = {
  auth: NonNullable<Awaited<ReturnType<typeof getCurrentAuth>>>;
  isPlatformAdmin: boolean;
  membership: NonNullable<Awaited<ReturnType<typeof getCurrentAuth>>>['memberships'][number] | null;
  viewerRole: string;
};

export async function requireAiAccess(params: {
  organizationId: string;
  blocked: string;
  cause?: string;
}) {
  const auth = await getCurrentAuth();
  if (!auth) {
    return {
      ok: false as const,
      response: guardAccessDeniedResponse(401, {
        code: 'AUTH_REQUIRED',
        blocked: '인증이 필요해 요청이 차단되었습니다.',
        cause: '로그인 세션이 없거나 만료되었습니다.',
        resolution: '다시 로그인한 뒤 요청을 재시도해 주세요.'
      })
    };
  }

  const membership = auth.memberships.find((item) => item.organization_id === params.organizationId) ?? null;
  const platformContextId = getPlatformOrganizationContextId(auth);
  const isPlatformAdmin = await hasActivePlatformAdminView(auth, platformContextId);

  if (!membership && !isPlatformAdmin) {
    return {
      ok: false as const,
      response: guardAccessDeniedResponse(403, {
        blocked: params.blocked,
        cause: params.cause ?? '현재 조직 멤버십 또는 플랫폼 관리자 권한이 확인되지 않았습니다.',
        resolution: '권한 없음'
      })
    };
  }

  return {
    ok: true as const,
    context: {
      auth,
      isPlatformAdmin,
      membership,
      viewerRole: membership?.role ?? auth.profile.platform_role ?? 'unknown'
    } satisfies AiAccessContext
  };
}

export function validateAiInputSafety(_params: {
  values: string[];
  blocked: string;
}): null {
  // 이전: 민감정보 감지 시 일괄 차단 → 이 서비스와 안 맞음
  // 현재: 기능별 prepareAiContext에서 정책에 맞게 처리
  // 이 함수는 하위 호환성을 위해 유지하되 항상 null(통과) 반환
  return null;
}

/**
 * 기능 정책에 맞게 원문 입력을 정리합니다.
 *
 * - 기존: 민감정보 감지 시 일괄 차단 (이 서비스와 안 맞음)
 * - 현재: 기능 정책의 redact 설정에 따라 필요한 것만 제거하고 문장 의미는 보존
 *   인증 토큰/API 키/세션은 기능 불문 항상 제거
 */
export function prepareAiContext(feature: AiFeatureId, rawInput: string): string {
  const policy = getAiFeaturePolicy(feature);
  let text = rawInput;

  // 인증정보/세션/API 키는 항상 제거
  TOKEN_RE.lastIndex = 0;
  API_KEY_RE.lastIndex = 0;
  SESSION_RE.lastIndex = 0;
  text = text.replace(TOKEN_RE, '[인증토큰]');
  text = text.replace(API_KEY_RE, (v) => { const [k] = v.split(/[:=]/); return `${k}=[키]`; });
  text = text.replace(SESSION_RE, (v) => { const [k] = v.split(/[:=]/); return `${k}=[세션]`; });

  if (policy.redactNationalId) {
    RESIDENT_RE.lastIndex = 0;
    text = text.replace(RESIDENT_RE, '[주민번호]');
  }

  if (policy.redactFinancial) {
    CARD_RE.lastIndex = 0;
    ACCOUNT_RE.lastIndex = 0;
    text = text.replace(CARD_RE, '[카드번호]');
    text = text.replace(ACCOUNT_RE, '[계좌번호]');
  }

  return text.trim();
}

export function getAiAllowedAnswerTypes(feature: AiFeatureId): AiAnswerType[] {
  return getAiFeaturePolicy(feature).allowedAnswerTypes;
}

export function isAiFeatureBlocked(feature: AiFeatureId) {
  return getAiFeaturePolicy(feature).blocked;
}

export function getAiBlockedReason(feature: AiFeatureId) {
  return getAiFeaturePolicy(feature).blockedReason ?? null;
}

const SANITIZE_ONLY_FEATURES = new Set<AiFeatureId>([
  'home_ai_assistant',
  'ai_summary_card',
  'next_action_recommendation',
  'draft_assist',
  'anomaly_alert',
  'admin_copilot',
  'client_profile_comment',
  'note_destination_recommender',
  'case_hub_conversation',
]);

export function prepareAiTextForFeature(feature: AiFeatureId, value: string) {
  const trimmed = String(value || '').trim();
  const prepared = prepareAiContext(feature, trimmed);
  return {
    value: prepared,
    hadSensitiveData: prepared !== sanitizeAiText(trimmed),
  };
}

export function prepareAiTextListForFeature(feature: AiFeatureId, values: string[]) {
  let hadSensitiveData = false;
  const prepared = values.map((value) => {
    const result = prepareAiTextForFeature(feature, value);
    hadSensitiveData = hadSensitiveData || result.hadSensitiveData;
    return result.value;
  });

  return {
    values: prepared,
    hadSensitiveData,
  };
}
