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
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return redirectWithClearedNext(request, new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '인증 처리 중 오류가 발생했습니다.';
      console.error('[auth/callback] code exchange failed:', message);
      return redirectWithClearedNext(request, new URL(`/login?error=${encodeURIComponent('로그인 처리에 실패했습니다. 다시 시도하거나 일반 로그인을 이용해 주세요.')}`, url.origin));
    }
  }

  return redirectWithClearedNext(request, new URL(next, url.origin));
}
