'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';

export function CredentialLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (signInError) {
        throw signInError;
      }

      window.location.assign('/');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '일반 로그인을 처리하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="space-y-2 text-sm text-slate-700">
        <span className="font-medium text-slate-900">이메일</span>
        <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" />
      </label>
      <label className="space-y-2 text-sm text-slate-700">
        <span className="font-medium text-slate-900">비밀번호</span>
        <Input type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="비밀번호를 입력해 주세요" />
      </label>
      {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      <SubmitButton pending={loading} pendingLabel="로그인 중..." disabled={loading} className="w-full justify-center rounded-[1.2rem]">일반 로그인</SubmitButton>
    </form>
  );
}