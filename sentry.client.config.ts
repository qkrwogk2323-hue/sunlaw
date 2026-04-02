// Sentry 클라이언트 초기화는 instrumentation-client.ts에서 수행합니다.
// 이 파일에서 중복 초기화하면 "Multiple Sentry Session Replay instances"
// 에러가 발생하여 React 하이드레이션이 깨집니다.
//
// 참고: Next.js 16에서는 instrumentation-client.ts가 공식 클라이언트 초기화 경로입니다.
