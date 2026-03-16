'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';

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
      const redirectTo = `${window.location.origin}/auth/callback`;
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
      const redirectUrl = new URL('/auth/callback', window.location.origin);
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
