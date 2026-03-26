import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? 'development',

  // 프로덕션에서만 에러 전송
  enabled: process.env.NODE_ENV === 'production',

  // 성능 트레이싱: 10% 샘플링
  tracesSampleRate: 0.1,

  // 세션 리플레이: 에러 발생 시만 녹화
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,      // PII 마스킹 (주민번호 등 노출 방지)
      blockAllMedia: true,
    }),
  ],
});
