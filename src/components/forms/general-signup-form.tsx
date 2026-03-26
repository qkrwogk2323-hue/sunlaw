'use client';

import type { FormEvent } from 'react';
import { useRef, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { PLATFORM_PRIVACY_CONSENT_LABEL } from '@/lib/legal-documents';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';

const privacyConsentNote =
  '가입을 진행하면 플랫폼의 개인정보 이용 및 처리방법과 서비스 이용약관에 동의한 것으로 기록됩니다. 자세한 내용은 자세히 보기에서 확인할 수 있습니다.';

export function GeneralSignupForm() {
  const router = useRouter();
  const [legalName, setLegalName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const passwordConfirmRef = useRef<HTMLInputElement>(null);
  const legalNameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const birthDateRef = useRef<HTMLInputElement>(null);

  const passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;
  const birthDateInvalid = birthDate.length > 0 && !/^\d{6}$/.test(birthDate.replace(/[^0-9]/g, ''));
  const isInvalid = passwordMismatch || !privacyConsent;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) { emailRef.current?.focus(); return; }
    if (password.length < 8) { passwordRef.current?.focus(); return; }
    if (password !== passwordConfirm) { passwordConfirmRef.current?.focus(); return; }
    if (!legalName.trim()) { legalNameRef.current?.focus(); return; }
    if (!phone.trim()) { phoneRef.current?.focus(); return; }
    if (!birthDate.trim()) { birthDateRef.current?.focus(); return; }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/auth/general-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          legalName,
          birthDate: birthDate.replace(/[^0-9]/g, ''),
          phone,
          privacyConsent,
          serviceConsent: privacyConsent
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : '일반회원가입을 처리하지 못했습니다.');
      }

      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (signInError) {
        throw signInError;
      }

      setSuccess('일반회원가입이 완료되었습니다. 가입 경로 선택 화면으로 이동합니다.');
      router.replace('/start/signup');
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '일반회원가입을 처리하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-slate-500"><span className="text-red-500">*</span> 필수 입력 항목입니다</p>
      <div className="grid gap-4 md:grid-cols-2">
        <label htmlFor="general-signup-email" className="space-y-2 text-sm text-slate-700">
          <span className="font-medium text-slate-900">이메일 아이디 <span className="text-red-500" aria-hidden="true">*</span></span>
          <Input ref={emailRef} id="general-signup-email" type="email" required aria-required="true" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="example@veinspiral.com" />
        </label>
        <label htmlFor="general-signup-password" className="space-y-2 text-sm text-slate-700">
          <span className="font-medium text-slate-900">비밀번호 <span className="text-red-500" aria-hidden="true">*</span></span>
          <Input ref={passwordRef} id="general-signup-password" type="password" required aria-required="true" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8자 이상 입력해 주세요" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label htmlFor="general-signup-password-confirm" className="space-y-2 text-sm text-slate-700">
          <span className="font-medium text-slate-900">비밀번호 확인 <span className="text-red-500" aria-hidden="true">*</span></span>
          <Input ref={passwordConfirmRef} id="general-signup-password-confirm" type="password" required aria-required="true" minLength={8} value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} placeholder="비밀번호를 한 번 더 입력해 주세요" />
          {passwordMismatch ? <p className="text-xs leading-6 text-rose-600">비밀번호가 일치하지 않습니다.</p> : null}
        </label>
        <label htmlFor="general-signup-legal-name" className="space-y-2 text-sm text-slate-700">
          <span className="font-medium text-slate-900">이름 <span className="text-red-500" aria-hidden="true">*</span></span>
          <Input ref={legalNameRef} id="general-signup-legal-name" required aria-required="true" value={legalName} onChange={(event) => setLegalName(event.target.value)} placeholder="홍길동" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label htmlFor="general-signup-phone" className="space-y-2 text-sm text-slate-700">
          <span className="font-medium text-slate-900">연락처 <span className="text-red-500" aria-hidden="true">*</span></span>
          <Input ref={phoneRef} id="general-signup-phone" type="tel" required aria-required="true" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="01012345678" />
        </label>
        <label htmlFor="general-signup-birth-date" className="space-y-2 text-sm text-slate-700">
          <span className="font-medium text-slate-900">생년월일 <span className="text-red-500" aria-hidden="true">*</span></span>
          <Input ref={birthDateRef} id="general-signup-birth-date" required aria-required="true" inputMode="numeric" maxLength={8} value={birthDate} onChange={(event) => setBirthDate(event.target.value)} placeholder="YYMMDD (예: 900101)" />
          {birthDateInvalid ? <p className="text-xs leading-6 text-rose-600">생년월일 6자리를 입력해 주세요. (예: 900101)</p> : null}
        </label>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={privacyConsent} onChange={(event) => setPrivacyConsent(event.target.checked)} className="mt-1 size-4 rounded border-slate-300" />
          <span>
            <span className="block font-medium text-slate-900">{PLATFORM_PRIVACY_CONSENT_LABEL} <span className="text-rose-500">*</span></span>
            <span className="block text-xs leading-6 text-slate-500">{privacyConsentNote}</span>
            <span className="mt-2 flex flex-wrap gap-3 text-xs font-medium">
              <Link href={'/privacy-policy' as Route} className="text-sky-700 underline underline-offset-4">
                자세히 보기
              </Link>
              <Link href={'/terms' as Route} className="text-slate-600 underline underline-offset-4">
                이용약관 보기
              </Link>
            </span>
          </span>
        </label>
      </div>

      {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      {success ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p> : null}

      <SubmitButton pendingLabel="회원가입 중..." disabled={loading || isInvalid} className="w-full justify-center rounded-[1.2rem]">
        일반회원가입
      </SubmitButton>
    </form>
  );
}
