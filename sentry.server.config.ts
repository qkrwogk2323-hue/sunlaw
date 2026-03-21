import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? 'development',

  enabled: process.env.NODE_ENV === 'production',

  tracesSampleRate: 0.1,

  // PII 필드는 Sentry로 절대 전송하지 않음
  beforeSend(event) {
    // 주민등록번호 패턴 제거 (6자리-7자리)
    const serialized = JSON.stringify(event);
    const sanitized = serialized.replace(/\d{6}-\d{7}/g, '[RRN-REDACTED]');
    return JSON.parse(sanitized);
  },
});
