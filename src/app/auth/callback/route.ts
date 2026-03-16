import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const POST_AUTH_NEXT_COOKIE = 'vs-post-auth-next';

function resolveSafeNextPath(request: NextRequest) {
  const queryNext = request.nextUrl.searchParams.get('next');
  const cookieNext = request.cookies.get(POST_AUTH_NEXT_COOKIE)?.value;
  const candidate = queryNext ?? cookieNext ?? '/dashboard';

  if (!candidate.startsWith('/') || candidate.startsWith('//')) {
    return '/dashboard';
  }

  return candidate;
}

function redirectWithClearedNext(request: NextRequest, destination: URL | string) {
  const response = NextResponse.redirect(destination);
  if (request.cookies.get(POST_AUTH_NEXT_COOKIE)) {
    response.cookies.set(POST_AUTH_NEXT_COOKIE, '', {
      path: '/',
      maxAge: 0,
      sameSite: 'lax'
    });
  }

  return response;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = resolveSafeNextPath(request);

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return redirectWithClearedNext(request, new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin));
    }
  }

  return redirectWithClearedNext(request, new URL(next, url.origin));
}
