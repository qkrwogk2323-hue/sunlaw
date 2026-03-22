import Link from 'next/link';
import type { Route } from 'next';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { buttonStyles } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PLATFORM_PRIVACY_CONSENT_LABEL,
  PLATFORM_PRIVACY_POLICY_VERSION,
  PLATFORM_PRIVACY_SUMMARY
} from '@/lib/legal-documents';

export const dynamic = 'force-dynamic';

const sections = [
  {
    title: '무엇을 수집하나요',
    body: [
      '조직 신청 담당자 이름, 이메일, 연락처, 사업자정보, 조직 신청 문서를 수집할 수 있습니다.',
      '구독 관리와 운영을 위해 결제, 구독 상태, 접속기록, 감사로그를 처리할 수 있습니다.'
    ]
  },
  {
    title: '왜 수집하나요',
    body: [
      '조직 신청 심사, 구독 관리, 운영 알림 발송, 감사로그 운영, 보안 대응을 위해 사용합니다.',
      '플랫폼 운영 목적과 무관한 범위로 임의 사용하지 않습니다.'
    ]
  },
  {
    title: '얼마나 보관하나요',
    body: [
      '조직 신청, 구독, 이용 제한·정지·종료 기록은 운영 기준에 따라 보관합니다.',
      '감사로그와 동의 이력은 별도 보관 기준에 따라 분리 관리합니다.'
    ]
  },
  {
    title: '무엇을 확인할 수 있나요',
    body: [
      '현재 적용 버전, 계약 문서, 동의 이력은 계약 관리에서 다시 확인할 수 있습니다.',
      '변경이 있으면 처리방침 버전과 고지 이력이 함께 남습니다.'
    ]
  }
];

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="space-y-8">
        <section className="overflow-hidden rounded-[2rem] border border-emerald-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_38%),linear-gradient(180deg,#f7fefb,#eefaf4)] p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">Privacy Policy</p>
              <div className="flex items-center gap-3">
                <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-white/80 text-emerald-700 shadow-sm">
                  <ShieldCheck className="size-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{PLATFORM_PRIVACY_CONSENT_LABEL}</h1>
                  <p className="mt-2 text-sm text-slate-600">현재 버전 {PLATFORM_PRIVACY_POLICY_VERSION}</p>
                </div>
              </div>
            </div>
            <Link href={'/start/signup' as Route} className={buttonStyles({ variant: 'secondary', className: 'min-h-12 rounded-[1.2rem] px-4' })}>
              <ArrowLeft className="size-4" /> 가입 화면으로 돌아가기
            </Link>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {PLATFORM_PRIVACY_SUMMARY.map((line) => (
              <div key={line} className="rounded-2xl border border-white/70 bg-white/80 px-4 py-4 text-sm leading-7 text-slate-700">
                {line}
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {sections.map((section) => (
            <Card key={section.title} className="rounded-[1.6rem] border-slate-200 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl text-slate-900">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-7 text-slate-600">
                {section.body.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
