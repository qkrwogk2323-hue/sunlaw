import Link from 'next/link';
import type { Route } from 'next';
import { ArrowLeft, FileText } from 'lucide-react';
import { buttonStyles } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PLATFORM_TERMS_SUMMARY, PLATFORM_TERMS_VERSION } from '@/lib/legal-documents';

// 정적 콘텐츠 — force-dynamic 제거로 빌드 타임 렌더 가능 (2026-04-16 감사).

const sections = [
  {
    title: '무엇을 제공하나요',
    body: [
      '플랫폼은 조직 신청, 구독 관리, 감사로그, 운영 알림, 계약 관리 같은 운영 기능을 제공합니다.',
      '실제 사건 실무와 의뢰인 정보 처리는 각 조직의 업무 범위 안에서 이뤄집니다.'
    ]
  },
  {
    title: '언제 이용을 제한할 수 있나요',
    body: [
      '허위 신청, 요금 미납, 보안 위협, 약관 위반, 타 조직 데이터 침해가 있으면 이용을 제한·정지·종료할 수 있습니다.',
      '긴급한 경우를 제외하면 사전 고지와 소명 기회를 두는 것을 원칙으로 합니다.'
    ]
  },
  {
    title: '무엇이 기록으로 남나요',
    body: [
      '조직 신청, 구독 변경, 이용 제한·정지·종료, 감사로그 열람은 운영 기록으로 남습니다.',
      '현재 적용 약관 버전과 동의 이력은 계약 관리에서 다시 확인할 수 있습니다.'
    ]
  }
];

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="space-y-8">
        <section className="overflow-hidden rounded-[2rem] border border-sky-200 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_35%),linear-gradient(180deg,#f8fbff,#eef6ff)] p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">Terms</p>
              <div className="flex items-center gap-3">
                <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-white/80 text-sky-700 shadow-sm">
                  <FileText className="size-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-950">서비스 이용약관</h1>
                  <p className="mt-2 text-sm text-slate-600">현재 버전 {PLATFORM_TERMS_VERSION}</p>
                </div>
              </div>
            </div>
            <Link href={'/start/signup' as Route} className={buttonStyles({ variant: 'secondary', className: 'min-h-12 rounded-[1.2rem] px-4' })}>
              <ArrowLeft className="size-4" /> 가입 화면으로 돌아가기
            </Link>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {PLATFORM_TERMS_SUMMARY.map((line) => (
              <div key={line} className="rounded-2xl border border-white/70 bg-white/80 px-4 py-4 text-sm leading-7 text-slate-700">
                {line}
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
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
