import { NextResponse } from 'next/server';
import type { GuardFeedback } from '@/lib/guard-feedback';
import { createAccessDeniedFeedback, createConditionFailedFeedback, createValidationFailedFeedback } from '@/lib/guard-feedback';

export function guardAccessDeniedResponse(
  status = 403,
  overrides?: Partial<GuardFeedback>
) {
  const feedback = createAccessDeniedFeedback(overrides);
  return NextResponse.json({
    ok: false,
    error: feedback.blocked,
    feedback
  }, { status });
}

export function guardValidationFailedResponse(
  status = 400,
  overrides?: Partial<GuardFeedback>
) {
  const feedback = createValidationFailedFeedback(overrides);
  return NextResponse.json({
    ok: false,
    error: feedback.blocked,
    feedback
  }, { status });
}

export function guardConditionFailedResponse(
  status = 400,
  overrides?: Partial<GuardFeedback>
) {
  const feedback = createConditionFailedFeedback(overrides);
  return NextResponse.json({
    ok: false,
    error: feedback.blocked,
    feedback
  }, { status });
}

export function guardServerErrorResponse(
  status = 500,
  blocked = '요청 처리 중 작업이 중단되었습니다.'
) {
  const feedback = createConditionFailedFeedback({
    code: 'INTERNAL_ERROR',
    blocked,
    cause: '서버 처리 과정에서 예기치 않은 문제가 발생했습니다.',
    resolution: '잠시 후 다시 시도해 주세요. 문제가 계속되면 관리자에게 문의해 주세요.'
  });
  return NextResponse.json({
    ok: false,
    error: feedback.blocked,
    feedback
  }, { status });
}
