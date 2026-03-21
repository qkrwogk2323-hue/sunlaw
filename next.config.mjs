import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '12mb'
    }
  }
};

export default withSentryConfig(nextConfig, {
  // Sentry 업로드는 SENTRY_AUTH_TOKEN 환경변수 있을 때만 동작
  silent: !process.env.SENTRY_AUTH_TOKEN,
  disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
  disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
});
