import Link from 'next/link';
import type { Route } from 'next';
import { ArrowRight, Link2, LogIn, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonStyles } from '@/components/ui/button';

export default function StartPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
      <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_460px]">
        <section className="vs-brand-panel rounded-[2rem] p-8 text-white shadow-[0_28px_60px_rgba(8,47,73,0.28)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-100/70">시작 안내</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">랜딩에서 다음 단계까지, 지금 해야 할 선택을 분명하게 안내합니다.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-slate-200/88">
            기존 기능은 그대로 유지하되, 시작 흐름을 조직 개설, 의뢰인 가입, 조직 연결 요청으로 분리했습니다. 지금 어디에 있고 다음에 무엇을 해야 하는지부터 먼저 보여줍니다.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ['1', '이용 방식 선택', '조직 개설인지, 의뢰인 가입인지, 이미 조직 키를 받은 연결 요청인지 먼저 나눕니다.'],
              ['2', '본인 또는 조직 정보 확인', '잘못 들어온 경우 이전 단계로 돌아가고, 현재 선택이 화면 상단에 계속 보입니다.'],
              ['3', '승인 후 진입', '승인 대기와 활성 상태를 구분해 로그인 후 보여줄 화면도 다르게 연결합니다.']
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
            <Link href={'/start/signup' as Route} className={buttonStyles({ variant: 'secondary', className: 'min-h-14 w-full justify-between rounded-[1.25rem] px-5 text-base' })}>
              <span className="inline-flex items-center gap-2"><UserPlus className="size-5" /> 회원가입하기</span>
              <ArrowRight className="size-4" />
            </Link>
            <Link href={'/start/signup?flow=connection' as Route} className={buttonStyles({ variant: 'secondary', className: 'min-h-14 w-full justify-between rounded-[1.25rem] px-5 text-base' })}>
              <span className="inline-flex items-center gap-2"><Link2 className="size-5" /> 조직 연결 요청</span>
              <ArrowRight className="size-4" />
            </Link>
            <p className="text-sm leading-7 text-slate-500">
              회원가입은 먼저 카카오 로그인으로 계정을 만든 뒤, 의뢰인 가입 또는 조직 개설 신청으로 나뉘어 진행됩니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}