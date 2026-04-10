import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? 'development',
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
  // Session Replay 제거 — 번들 ~150K 절감.
  // 필요 시 별도 lazy load로 전환 가능.
  replaysOnErrorSampleRate: 0,
  replaysSessionSampleRate: 0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
