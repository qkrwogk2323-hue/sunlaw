import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveSupabaseCookieDomain } from '@/lib/supabase/cookie-options';

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
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
      domain: resolveSupabaseCookieDomain(request.nextUrl.hostname)
    });
  }

  return response;
}

function toCallbackErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return '로그인 연결을 완료하지 못했습니다. 로그인 화면에서 다시 시도해 주세요.';
  }

  const message = error.message.toLowerCase();
  if (message.includes('pkce') || message.includes('code verifier')) {
    return '로그인 연결 정보가 만료되었거나 저장되지 않았습니다. 로그인 버튼을 다시 눌러 처음부터 진행해 주세요.';
  }

  if (message.includes('invalid flow state') || message.includes('bad_oauth_state') || message.includes('state')) {
    return '로그인 연결 상태가 맞지 않습니다. 로그인 버튼을 다시 눌러 처음부터 진행해 주세요.';
  }

  return '로그인 연결을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = resolveSafeNextPath(request);

  try {
    if (code) {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return redirectWithClearedNext(request, new URL(`/login?error=${encodeURIComponent(toCallbackErrorMessage(error))}`, url.origin));
      }
    }
  } catch (error) {
    console.error('auth callback failed', error);
    return redirectWithClearedNext(request, new URL(`/login?error=${encodeURIComponent(toCallbackErrorMessage(error))}`, url.origin));
  }

  return redirectWithClearedNext(request, new URL(next, url.origin));
}
