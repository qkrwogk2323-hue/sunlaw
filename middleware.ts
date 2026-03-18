import { NextResponse, type NextRequest } from 'next/server';

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

export async function middleware(request: NextRequest) {
  const authRedirect = redirectOAuthCodeToCallback(request);
  if (authRedirect) {
    return authRedirect;
  }

  if (!shouldRunSessionUpdate(request.nextUrl.pathname)) {
    return NextResponse.next({ request });
  }

  // NOTE: 미들웨어 타임아웃 방지를 위해 세션 갱신은 앱 라우트 내부에서 처리합니다.
  return NextResponse.next({ request });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
};
