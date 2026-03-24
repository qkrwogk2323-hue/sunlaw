export type GuardFeedbackType = 'access_denied' | 'validation_failed' | 'condition_failed';

export type GuardFeedback = {
  type: GuardFeedbackType;
  code: string;
  blocked: string;
  cause: string;
  resolution: string;
};

const GUARD_FEEDBACK_PREFIX = '__GUARD_FEEDBACK__:';

export function createAccessDeniedFeedback(overrides?: Partial<GuardFeedback>): GuardFeedback {
  return {
    type: 'access_denied',
    code: 'ACCESS_DENIED',
    blocked: '플랫폼 관리자 전용 기능입니다.',
    cause: '현재 조직 또는 현재 계정 권한으로는 이 작업을 수행할 수 없습니다.',
    resolution: '플랫폼 조직 관리자 권한으로 전환하거나, 권한 승인을 요청해 주세요.',
    ...overrides
  };
}

export function createValidationFailedFeedback(overrides?: Partial<GuardFeedback>): GuardFeedback {
  return {
    type: 'validation_failed',
    code: 'VALIDATION_FAILED',
    blocked: '입력값 검증에서 차단되었습니다.',
    cause: '요청 값이 유효성 조건을 만족하지 못했습니다.',
    resolution: '필수 항목과 입력 형식을 확인한 뒤 다시 제출해 주세요.',
    ...overrides
  };
}

export function createConditionFailedFeedback(overrides?: Partial<GuardFeedback>): GuardFeedback {
  return {
    type: 'condition_failed',
    code: 'CONDITION_FAILED',
    blocked: '요청 조건이 충족되지 않아 작업이 차단되었습니다.',
    cause: '현재 상태에서 이 작업을 수행할 수 없는 조건입니다.',
    resolution: '요청 대상의 상태를 확인하고 필요한 선행 작업을 완료해 주세요.',
    ...overrides
  };
}

export function encodeGuardFeedback(feedback: GuardFeedback) {
  return `${GUARD_FEEDBACK_PREFIX}${JSON.stringify(feedback)}`;
}

export function throwGuardFeedback(feedback: GuardFeedback): never {
  throw new Error(encodeGuardFeedback(feedback));
}

export function parseGuardFeedback(error: unknown): GuardFeedback | null {
  if (!(error instanceof Error)) return null;
  if (!error.message.startsWith(GUARD_FEEDBACK_PREFIX)) return null;

  const json = error.message.slice(GUARD_FEEDBACK_PREFIX.length);
  try {
    const parsed = JSON.parse(json) as GuardFeedback;
    if (!parsed?.blocked || !parsed?.cause || !parsed?.resolution) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function normalizeGuardFeedback(
  error: unknown,
  fallback: GuardFeedback = createConditionFailedFeedback({
    blocked: '작업이 차단되었습니다.',
    cause: '요청 처리 중 조건 검증에 실패했습니다.',
    resolution: '입력값과 권한 상태를 확인한 뒤 다시 시도해 주세요.'
  })
): GuardFeedback {
  const parsed = parseGuardFeedback(error);
  if (parsed) return parsed;

  if (error instanceof Error && error.message.trim().startsWith('[')) {
    try {
      const parsedIssues = JSON.parse(error.message) as Array<{ path?: string[]; message?: string }>;
      if (Array.isArray(parsedIssues) && parsedIssues.length > 0) {
        const firstIssue = parsedIssues[0];
        const fieldHint = Array.isArray(firstIssue?.path) && firstIssue.path.length > 0
          ? `[${firstIssue.path.join(' › ')}] `
          : '';
        return {
          ...fallback,
          type: 'validation_failed',
          code: 'VALIDATION_FAILED',
          blocked: '입력값 오류로 작업이 차단되었습니다.',
          cause: `${fieldHint}${firstIssue?.message ?? '입력값을 확인해 주세요.'}`,
          resolution: '표시된 항목을 수정한 뒤 다시 제출해 주세요.'
        };
      }
    } catch {
      // ignore malformed message payload and continue with the standard fallback path
    }
  }

  // ZodError duck-type: .issues 배열이 있으면 첫 번째 사람이 읽을 수 있는 메시지를 추출
  if (
    error instanceof Error
    && Array.isArray((error as any).issues)
    && (error as any).issues.length > 0
  ) {
    const firstIssue = (error as any).issues[0];
    const fieldHint = Array.isArray(firstIssue?.path) && firstIssue.path.length > 0
      ? `[${firstIssue.path.join(' › ')}] `
      : '';
    const message = `${fieldHint}${firstIssue?.message ?? '입력값을 확인해 주세요.'}`;
    return {
      ...fallback,
      type: 'validation_failed',
      code: 'VALIDATION_FAILED',
      blocked: '입력값 오류로 작업이 차단되었습니다.',
      cause: message,
      resolution: '표시된 항목을 수정한 뒤 다시 제출해 주세요.'
    };
  }

  if (error instanceof Error && error.message.trim()) {
    // 프로덕션 빌드에서 Next.js는 서버 액션/컴포넌트 오류 메시지를 digest로 대체한다.
    // digest 메시지를 사용자에게 그대로 노출하면 안 되므로 fallback blocked 값을 사용한다.
    const isNextProductionDigest =
      error.message.includes('An error occurred in the Server Components render') ||
      ('digest' in error && typeof (error as any).digest === 'string');
    if (isNextProductionDigest) {
      return fallback;
    }
    return {
      ...fallback,
      blocked: error.message.trim()
    };
  }
  return fallback;
}

export function formatGuardFeedbackMessage(feedback: GuardFeedback) {
  return `원인: ${feedback.cause} · 해결 방법: ${feedback.resolution}`;
}

export function fallbackUnexpectedFeedback(): GuardFeedback {
  return createConditionFailedFeedback({
    code: 'UNEXPECTED_EXCEPTION',
    blocked: '설명되지 않은 예외가 발생했습니다.',
    cause: '현재 오류는 분류된 업무 오류로 설명되지 않았습니다. 버그일 가능성이 높습니다.',
    resolution: '같은 작업을 다시 시도해도 반복되면 관리자에게 화면과 입력값을 함께 전달해 주세요.'
  });
}
