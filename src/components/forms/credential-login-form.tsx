'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';

function toLoginErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return '로그인을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }

  const message = error.message.toLowerCase();
  if (message.includes('invalid login credentials') || message.includes('email not confirmed')) {
    return '아이디 또는 비밀번호가 올바르지 않습니다.';
  }

  if (message.includes('too many requests')) {
    return '로그인 시도가 많아 잠시 제한되었습니다. 잠시 후 다시 시도해 주세요.';
  }

  return error.message || '로그인을 처리하지 못했습니다.';
}

export function CredentialLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [organizationKey, setOrganizationKey] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      let resolvedEmail = email.trim();

      if (resolvedEmail && !resolvedEmail.includes('@')) {
        const isStaffTempLogin = Boolean(organizationKey.trim());
        const response = await fetch(isStaffTempLogin ? '/api/auth/temp-login/resolve' : '/api/auth/temp-login/resolve-client', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(
            isStaffTempLogin
              ? { organizationKey: organizationKey.trim(), loginId: resolvedEmail }
              : { loginId: resolvedEmail }
          )
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.email) {
          throw new Error(payload?.message ?? '조직 식별값 또는 임시 아이디를 확인해 주세요.');
        }

        resolvedEmail = payload.email;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password
      });

      if (signInError) {
        throw signInError;
      }

      router.replace('/login');
      router.refresh();
    } catch (submitError) {
      setError(toLoginErrorMessage(submitError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="space-y-2 text-sm text-slate-700">
        <span className="font-medium text-slate-900">이메일 또는 임시 아이디</span>
        <Input required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="이메일 또는 임시 아이디" />
      </label>
      <label className="space-y-2 text-sm text-slate-700">
        <span className="font-medium text-slate-900">조직 식별값(임시 아이디 로그인 시 필수)</span>
        <Input value={organizationKey} onChange={(event) => setOrganizationKey(event.target.value)} placeholder="예: vein-bn-1" />
      </label>
      <label className="space-y-2 text-sm text-slate-700">
        <span className="font-medium text-slate-900">비밀번호</span>
        <Input type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="비밀번호를 입력해 주세요" />
      </label>
      {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      <SubmitButton pendingLabel="로그인 중..." disabled={loading} className="w-full justify-center rounded-[1.2rem]">일반 로그인</SubmitButton>
    </form>
  );
}
