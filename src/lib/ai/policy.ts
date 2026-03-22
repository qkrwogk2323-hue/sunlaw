import { getCurrentAuth, getPlatformOrganizationContextId, hasActivePlatformAdminView } from '@/lib/auth';
import { guardAccessDeniedResponse, guardValidationFailedResponse } from '@/lib/api-guard-response';
import { containsSensitiveData } from '@/lib/ai/guardrails';

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

export function validateAiInputSafety(params: {
  values: string[];
  blocked: string;
}) {
  if (!params.values.some((value) => containsSensitiveData(value))) {
    return null;
  }

  return guardValidationFailedResponse(400, {
    blocked: params.blocked,
    cause: '민감정보 패턴이 탐지되어 모델 호출 또는 저장이 차단되었습니다.',
    resolution: '민감정보를 제거한 뒤 다시 시도해 주세요.'
  });
}
