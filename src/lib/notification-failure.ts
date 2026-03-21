/**
 * 알림 전달 실패 추적 유틸리티
 *
 * 알림 INSERT 실패는 주 작업을 롤백하지 않지만,
 * 조용히 무시하면 디버깅이 불가능하다.
 * Sentry로 캡처하여 모니터링 대시보드에서 추적 가능하게 한다.
 */
import * as Sentry from '@sentry/nextjs';

export function captureNotificationFailure(
  error: unknown,
  context: string,
  extra?: Record<string, unknown>
) {
  const err = error instanceof Error ? error : new Error(String(error));

  console.error(`[notification-failure] ${context}:`, err.message);

  Sentry.captureException(err, {
    tags: { component: 'notification-delivery', context },
    extra,
  });
}
