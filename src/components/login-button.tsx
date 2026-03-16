'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';

export function LoginButton() {
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
          queryParams: {
            prompt: 'login'
          }
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
      {loading ? '연결 중...' : '카카오로 로그인'}
    </Button>
  );
}

export function LoginButtonWithNext({ next }: { next?: string }) {
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
          queryParams: {
            prompt: 'login'
          }
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
      {loading ? '연결 중...' : '카카오로 로그인'}
    </Button>
  );
}
