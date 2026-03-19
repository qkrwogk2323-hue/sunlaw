import Link from 'next/link';
import type { Route } from 'next';
import { ArrowRight, LogIn, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonStyles } from '@/components/ui/button';

export default function StartPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
      <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_460px]">
        <section className="vs-brand-panel rounded-[2rem] p-8 text-white shadow-[0_28px_60px_rgba(8,47,73,0.28)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-100/70">시작 안내</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">로그인과 회원가입부터 시작하고, 그다음 경로를 정확하게 나눕니다.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-slate-200/88">
            먼저 계정을 만들고, 그다음 의뢰인 가입인지 조직 생성 신청인지, 또는 조직 초대코드로 바로 연결할지 이어서 선택할 수 있게 시작 흐름을 단순하게 정리했습니다.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ['1', '로그인 또는 회원가입', '시작 화면에서는 먼저 계정 진입만 고르게 해서 사용자가 흐름을 헷갈리지 않게 만듭니다.'],
              ['2', '가입 경로 선택', '회원가입 직후 의뢰인 가입, 조직 생성 신청, 조직 초대코드 연결로 나뉩니다.'],
              ['3', '상태별 다음 행동 안내', '초대코드 입력, 조직가입신청, 승인 대기 확인처럼 지금 해야 할 행동만 보이도록 정리합니다.']
            ].map(([step, title, body]) => (
              <div key={step} className="rounded-2xl border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-100/70">Step {step}</p>
                <p className="mt-3 text-sm font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm leading-7 text-slate-200/82">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <Card className="self-center rounded-[2rem] border-white/70 bg-white/92">
          <CardHeader className="border-none pb-2">
            <CardTitle className="text-2xl">지금 필요한 시작 경로</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href={'/login' as Route} className={buttonStyles({ className: 'min-h-14 w-full justify-between rounded-[1.25rem] px-5 text-base' })}>
              <span className="inline-flex items-center gap-2"><LogIn className="size-5" /> 로그인하기</span>
              <ArrowRight className="size-4" />
            </Link>
            <Link href={'/signup' as Route} className={buttonStyles({ variant: 'secondary', className: 'min-h-14 w-full justify-between rounded-[1.25rem] px-5 text-base' })}>
              <span className="inline-flex items-center gap-2"><UserPlus className="size-5" /> 회원가입하기</span>
              <ArrowRight className="size-4" />
            </Link>
            <p className="text-sm leading-7 text-slate-500">
              회원가입 후에는 의뢰인 가입, 조직 생성 신청, 조직 초대코드 연결 중 필요한 경로를 다시 선택할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
