import { NextResponse, type NextRequest } from 'next/server';

const CANONICAL_HOST = 'www.veinspiral.com';
const LEGACY_HOST = 'veinspiral.com';

export function middleware(request: NextRequest) {
  const { nextUrl } = request;

  if (
    nextUrl.protocol === 'https:' &&
    nextUrl.hostname === LEGACY_HOST
  ) {
    const redirectUrl = new URL(request.url);
    redirectUrl.hostname = CANONICAL_HOST;
    return NextResponse.redirect(redirectUrl, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
