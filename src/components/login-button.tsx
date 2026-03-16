'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';

const POST_AUTH_NEXT_COOKIE = 'vs-post-auth-next';

function resolveAuthOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Ignore malformed env and fall back to the current origin.
    }
  }

  return window.location.origin;
}

function resolveCookieDomain(authOrigin: string) {
  const currentHostname = window.location.hostname;
  const authHostname = new URL(authOrigin).hostname;

  if (currentHostname === authHostname) {
    return null;
  }

  const currentWithoutWww = currentHostname.replace(/^www\./, '');
  const authWithoutWww = authHostname.replace(/^www\./, '');

  if (currentWithoutWww !== authWithoutWww) {
    return null;
  }

  if (currentWithoutWww === 'localhost' || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(currentWithoutWww)) {
    return null;
  }

  return `.${currentWithoutWww}`;
}

function writePostAuthNextCookie(next?: string) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return;
  }

  const authOrigin = resolveAuthOrigin();
  const domain = resolveCookieDomain(authOrigin);
  const secure = authOrigin.startsWith('https://') ? '; secure' : '';
  const domainAttribute = domain ? `; domain=${domain}` : '';

  document.cookie = `${POST_AUTH_NEXT_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=600; samesite=lax${domainAttribute}${secure}`;
}

type LoginButtonProps = {
  idleLabel?: string;
  loadingLabel?: string;
  forceLoginPrompt?: boolean;
};

export function LoginButton({
  idleLabel = '카카오로 로그인',
  loadingLabel = '연결 중...',
  forceLoginPrompt = true
}: LoginButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = `${resolveAuthOrigin()}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo,
          ...(forceLoginPrompt
            ? {
                queryParams: {
                  prompt: 'login'
                }
              }
            : {})
        }
      });

      if (error) {
        throw error;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="button" size="lg" onClick={handleLogin} isLoading={loading}>
      {loading ? loadingLabel : idleLabel}
    </Button>
  );
}

type LoginButtonWithNextProps = LoginButtonProps & {
  next?: string;
};

export function LoginButtonWithNext({
  next,
  idleLabel = '카카오로 로그인',
  loadingLabel = '연결 중...',
  forceLoginPrompt = true
}: LoginButtonWithNextProps) {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const redirectUrl = new URL('/auth/callback', resolveAuthOrigin());
      writePostAuthNextCookie(next);
      if (next) {
        redirectUrl.searchParams.set('next', next);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: redirectUrl.toString(),
          ...(forceLoginPrompt
            ? {
                queryParams: {
                  prompt: 'login'
                }
              }
            : {})
        }
      });

      if (error) {
        throw error;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="button" size="lg" onClick={handleLogin} isLoading={loading}>
      {loading ? loadingLabel : idleLabel}
    </Button>
  );
}
