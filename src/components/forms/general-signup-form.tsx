'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { isValidResidentRegistrationNumber, normalizeResidentRegistrationNumber } from '@/lib/format';
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
  const [residentNumber, setResidentNumber] = useState('');
  const [residentNumberConfirm, setResidentNumberConfirm] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const normalizedResidentNumber = normalizeResidentRegistrationNumber(residentNumber);
  const normalizedResidentNumberConfirm = normalizeResidentRegistrationNumber(residentNumberConfirm);
  const residentNumberMismatch = residentNumberConfirm.length > 0 && normalizedResidentNumber !== normalizedResidentNumberConfirm;
  const residentNumberInvalid = residentNumber.length > 0 && normalizedResidentNumber.length === 13 && !isValidResidentRegistrationNumber(normalizedResidentNumber);
  const isInvalid = residentNumberMismatch || residentNumberInvalid || !privacyConsent;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
          residentNumber,
          phone,
          addressLine1,
          addressLine2,
          postalCode,
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
      <div className="grid gap-4 md:grid-cols-2">
        <label htmlFor="general-signup-email" className="space-y-2 text-sm text-slate-700">
          <span className="font-medium text-slate-900">이메일</span>
          <Input id="general-signup-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="example@veinspiral.com" />
        </label>
        <label htmlFor="general-signup-password" className="space-y-2 text-sm text-slate-700">
          <span className="font-medium text-slate-900">비밀번호</span>
          <Input id="general-signup-password" type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8자 이상 입력해 주세요" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label htmlFor="general-signup-legal-name" className="space-y-2 text-sm text-slate-700">
          <span className="font-medium text-slate-900">이름</span>
          <Input id="general-signup-legal-name" required value={legalName} onChange={(event) => setLegalName(event.target.value)} placeholder="홍길동" />
        </label>
        <label htmlFor="general-signup-phone" className="space-y-2 text-sm text-slate-700">
          <span className="font-medium text-slate-900">연락처</span>
          <Input id="general-signup-phone" required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="01012345678" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label htmlFor="general-signup-resident-number" className="space-y-2 text-sm text-slate-700">
          <span className="font-medium text-slate-900">주민등록번호</span>
          <Input id="general-signup-resident-number" required value={residentNumber} onChange={(event) => setResidentNumber(event.target.value)} placeholder="생년월일 6자리와 뒤 7자리를 입력해 주세요" />
          {residentNumberInvalid ? <p className="text-xs leading-6 text-rose-600">유효한 주민등록번호를 입력해 주세요.</p> : null}
        </label>
        <label htmlFor="general-signup-resident-number-confirm" className="space-y-2 text-sm text-slate-700">
          <span className="font-medium text-slate-900">주민등록번호 확인</span>
          <Input id="general-signup-resident-number-confirm" required value={residentNumberConfirm} onChange={(event) => setResidentNumberConfirm(event.target.value)} placeholder="주민등록번호를 한 번 더 입력해 주세요" />
          {residentNumberMismatch ? <p className="text-xs leading-6 text-rose-600">주민번호가 다릅니다.</p> : null}
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
        <label htmlFor="general-signup-address-line1" className="space-y-2 text-sm text-slate-700">
          <span className="font-medium text-slate-900">주소</span>
          <Input id="general-signup-address-line1" value={addressLine1} onChange={(event) => setAddressLine1(event.target.value)} placeholder="선택 입력" />
        </label>
        <label htmlFor="general-signup-postal-code" className="space-y-2 text-sm text-slate-700">
          <span className="font-medium text-slate-900">우편번호</span>
          <Input id="general-signup-postal-code" value={postalCode} onChange={(event) => setPostalCode(event.target.value)} placeholder="선택 입력" />
        </label>
      </div>

      <label htmlFor="general-signup-address-line2" className="space-y-2 text-sm text-slate-700">
        <span className="font-medium text-slate-900">상세 주소</span>
        <Input id="general-signup-address-line2" value={addressLine2} onChange={(event) => setAddressLine2(event.target.value)} placeholder="선택 입력" />
      </label>

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
