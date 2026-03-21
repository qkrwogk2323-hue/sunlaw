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

function isMaintenanceMode() {
  // Use an explicit sentinel so accidental truthy env values do not lock all routes.
  return process.env.MAINTENANCE_MODE === 'enabled';
}

function shouldBypassMaintenance(pathname: string) {
  return pathname === '/maintenance' || pathname.startsWith('/_next') || pathname.startsWith('/api');
}

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

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

  // NOTE: 미들웨어 타임아웃 방지를 위해 세션 갱신은 앱 라우트 내부에서 처리합니다.
  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
};
