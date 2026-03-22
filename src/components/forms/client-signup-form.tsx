'use client';

import { useMemo, useState } from 'react';
import { isValidResidentRegistrationNumber, normalizeResidentRegistrationNumber } from '@/lib/format';
import { PLATFORM_REQUIRED_CONSENTS } from '@/lib/legal-documents';
import { submitClientSignupAction } from '@/lib/actions/client-account-actions';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import Link from 'next/link';
import type { Route } from 'next';

export function ClientSignupForm() {
  const [residentNumber, setResidentNumber] = useState('');
  const [residentNumberConfirm, setResidentNumberConfirm] = useState('');
  const [consents, setConsents] = useState<Record<string, boolean>>({ privacyConsent: false, serviceConsent: false, aiPolicyConsent: false });

  const normalizedResidentNumber = normalizeResidentRegistrationNumber(residentNumber);
  const normalizedResidentNumberConfirm = normalizeResidentRegistrationNumber(residentNumberConfirm);
  const residentNumberMismatch = residentNumberConfirm.length > 0 && normalizedResidentNumber !== normalizedResidentNumberConfirm;
  const residentNumberInvalid = residentNumber.length > 0 && normalizedResidentNumber.length === 13 && !isValidResidentRegistrationNumber(normalizedResidentNumber);
  const missingConsent = useMemo(() => PLATFORM_REQUIRED_CONSENTS.find((item) => !consents[item.key]), [consents]);

  return (
    <ClientActionForm action={submitClientSignupAction} successTitle="가입 신청이 접수되었습니다." errorTitle="가입 접수에 실패했습니다." className="space-y-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500"><span className="font-medium text-rose-500">*</span> 표시 항목은 필수입니다. 주소는 선택 항목입니다.</div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-700"><span className="font-medium text-slate-900">이름 <span className="text-rose-500">*</span></span><Input name="legalName" placeholder="홍길동" required /></label>
        <label className="space-y-2 text-sm text-slate-700"><span className="font-medium text-slate-900">연락처 <span className="text-rose-500">*</span></span><Input name="phone" placeholder="01012345678" required /><p className="text-xs text-slate-400">하이픈 없이 숫자만 입력</p></label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-700"><span className="font-medium text-slate-900">주민등록번호 <span className="text-rose-500">*</span></span><Input name="residentNumber" placeholder="생년월일 6자리와 뒤 7자리를 입력해 주세요" required value={residentNumber} onChange={(event) => setResidentNumber(event.target.value)} />{residentNumberInvalid ? <p className="text-xs leading-6 text-rose-600">유효한 주민등록번호를 입력해 주세요.</p> : null}</label>
        <label className="space-y-2 text-sm text-slate-700"><span className="font-medium text-slate-900">주민등록번호 확인 <span className="text-rose-500">*</span></span><Input placeholder="주민등록번호를 한 번 더 입력해 주세요" required value={residentNumberConfirm} onChange={(event) => setResidentNumberConfirm(event.target.value)} />{residentNumberMismatch ? <p className="text-xs leading-6 text-rose-600">주민번호가 다릅니다.</p> : null}</label>
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
        <label className="space-y-2 text-sm text-slate-700"><span className="font-medium text-slate-900">기본 주소</span><Input name="addressLine1" placeholder="선택 입력" /></label>
        <label className="space-y-2 text-sm text-slate-700"><span className="font-medium text-slate-900">우편번호</span><Input name="postalCode" placeholder="선택 입력" /></label>
      </div>
      <label className="space-y-2 text-sm text-slate-700"><span className="font-medium text-slate-900">상세 주소</span><Input name="addressLine2" placeholder="동, 호수 등 상세주소" /></label>
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
        {PLATFORM_REQUIRED_CONSENTS.map((item) => (
          <label key={item.key} className="flex items-start gap-3 rounded-2xl border border-white bg-white px-4 py-3">
            <input type="checkbox" name={item.key} checked={consents[item.key]} onChange={(event) => setConsents((current) => ({ ...current, [item.key]: event.target.checked }))} required={!consents[item.key] && item.key === missingConsent?.key} className="mt-1 size-4 rounded border-slate-300" />
            <span><span className="block font-medium text-slate-900">{item.label} <span className="text-rose-500">*</span></span><span className="block text-xs leading-6 text-slate-500">{item.description}</span><Link href={item.href as Route} className="mt-2 inline-block text-xs font-medium text-sky-700 underline underline-offset-4">자세히 보기</Link></span>
          </label>
        ))}
      </div>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900">가입 직후 바로 업무 화면이 열리지는 않습니다. 기본 상태는 승인 대기이며, 조직 연결 요청과 승인 결과에 따라 포털 접근이 열립니다.</div>
      <SubmitButton className="w-full justify-center rounded-[1.2rem]" pendingLabel="가입 접수 중..." disabled={residentNumberMismatch || residentNumberInvalid || Boolean(missingConsent)}>본인정보 등록하고 승인 대기 시작</SubmitButton>
    </ClientActionForm>
  );
}
