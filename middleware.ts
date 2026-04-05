import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const AUTH_REQUIRED_PREFIXES = [
  '/dashboard',
  '/cases',
  '/clients',
  '/calendar',
  '/documents',
  '/notifications',
  '/inbox',
  '/organizations',
  '/settings',
  '/portal',
  '/billing',
  '/collections',
  '/reports',
  '/client-access',
  '/start'
];

// Rate limiting: 슬라이딩 윈도우 (per-edge-isolate)
// 멀티 인스턴스 환경에서는 Upstash Redis(@upstash/ratelimit) 도입 필요
const globalRateLimitStore = globalThis as typeof globalThis & {
  __veinRateLimitStore?: Map<string, number[]>;
};
const rateLimitStore = globalRateLimitStore.__veinRateLimitStore ?? new Map<string, number[]>();
globalRateLimitStore.__veinRateLimitStore = rateLimitStore;

const RATE_LIMIT_RULES: Record<string, { windowMs: number; max: number }> = {
  '/api/auth/temp-login/resolve':      { windowMs: 60_000, max: 10 },
  '/api/auth/temp-login/resolve-client': { windowMs: 60_000, max: 10 },
  '/api/dashboard-ai/commit':          { windowMs: 60_000, max: 20 },
  '/api/dashboard-ai/coordination-commit': { windowMs: 60_000, max: 20 },
  '/api/cases/intake-parse':           { windowMs: 60_000, max: 20 },
  '/api/dashboard/messages':           { windowMs: 60_000, max: 30 },
};

function checkRateLimit(ip: string, pathname: string): boolean {
  const rule = RATE_LIMIT_RULES[pathname];
  if (!rule) return true;

  const key = `${ip}:${pathname}`;
  const now = Date.now();
  const timestamps = (rateLimitStore.get(key) ?? []).filter((t) => now - t < rule.windowMs);

  if (timestamps.length >= rule.max) {
    return false;
  }

  timestamps.push(now);
  rateLimitStore.set(key, timestamps);
  return true;
}

function shouldRunSessionUpdate(pathname: string) {
  return AUTH_REQUIRED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function redirectOAuthCodeToCallback(request: NextRequest) {
  if (request.nextUrl.pathname === '/auth/callback') {
    return null;
  }

  if (!request.nextUrl.searchParams.has('code')) {
    return null;
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = '/auth/callback';

  if (!redirectUrl.searchParams.has('next') && request.nextUrl.pathname !== '/') {
    const original = new URL(request.url);
    original.searchParams.delete('code');
    original.searchParams.delete('state');
    const nextPath = `${original.pathname}${original.search}`;
    if (nextPath !== '/') {
      redirectUrl.searchParams.set('next', nextPath);
    }
  }

  return NextResponse.redirect(redirectUrl);
}

function isMaintenanceMode() {
  // Use an explicit sentinel so accidental truthy env values do not lock all routes.
  return process.env.MAINTENANCE_MODE === 'enabled';
}

function shouldBypassMaintenance(pathname: string) {
  return pathname === '/maintenance' || pathname.startsWith('/_next') || pathname.startsWith('/api');
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.hostname === 'veinspiral.com') {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.hostname = 'www.veinspiral.com';
    return NextResponse.redirect(canonicalUrl, 308);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  // Rate limiting: POST 요청만 체크 (GET은 멱등성 보장)
  if (request.method === 'POST') {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';
    const rateLimitIdentity = ip === 'unknown'
      ? `ua:${request.headers.get('user-agent') ?? 'unknown'}`
      : ip;
    if (!checkRateLimit(rateLimitIdentity, request.nextUrl.pathname)) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
  }

  if (isMaintenanceMode() && !shouldBypassMaintenance(request.nextUrl.pathname)) {
    const maintenanceUrl = request.nextUrl.clone();
    maintenanceUrl.pathname = '/maintenance';
    return NextResponse.redirect(maintenanceUrl);
  }

  const authRedirect = redirectOAuthCodeToCallback(request);
  if (authRedirect) {
    return authRedirect;
  }

  if (!shouldRunSessionUpdate(request.nextUrl.pathname)) {
    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
  }

  // x-pathname 헤더를 request에 설정한 후 세션 갱신
  request.headers.set('x-pathname', request.nextUrl.pathname);

  // 세션 갱신: Supabase 인증 토큰 자동 리프레시
  return await updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
};
