'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { buttonStyles } from '@/components/ui/button';

export function ServiceDocsToggle({
  privacyConsentRecordedAtLabel,
  privacyLabel,
  privacyVersion,
  termsVersion,
  contractVersion,
  contractSummary
}: {
  privacyConsentRecordedAtLabel: string;
  privacyLabel: string;
  privacyVersion: string;
  termsVersion: string;
  contractVersion: string;
  contractSummary: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-sm lg:ml-auto">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div>
          <p className="text-sm font-semibold text-slate-900">서비스 문서와 동의 이력</p>
          <p className="mt-1 text-xs text-slate-500">{privacyConsentRecordedAtLabel}</p>
        </div>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-base font-semibold text-slate-700">
          {open ? '-' : '+'}
        </span>
      </button>
      {open ? (
        <div className="border-t border-slate-200 px-4 py-4">
          <div className="space-y-3 text-sm">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">{privacyLabel}</p>
              <p className="mt-1 text-slate-600">버전 {privacyVersion}</p>
              <Link href={'/privacy-policy' as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'mt-3 h-9 rounded-xl px-3 text-xs' })}>
                자세히 보기
              </Link>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">서비스 이용약관</p>
              <p className="mt-1 text-slate-600">버전 {termsVersion}</p>
              <Link href={'/terms' as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'mt-3 h-9 rounded-xl px-3 text-xs' })}>
                자세히 보기
              </Link>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">플랫폼-조직 계약 기준</p>
              <p className="mt-1 text-slate-600">버전 {contractVersion}</p>
              <div className="mt-2 space-y-1 text-xs leading-6 text-slate-600">
                {contractSummary.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
