import Link from 'next/link';
import type { Route } from 'next';
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Link2, Users } from 'lucide-react';
import { getCurrentAuth } from '@/lib/auth';
import { clientAccountStatusLabel, isClientAccountPending } from '@/lib/client-account';
import { GeneralSignupForm } from '@/components/forms/general-signup-form';
import { LoginButtonWithNext } from '@/components/login-button';
import { ClientSignupForm } from '@/components/forms/client-signup-form';
import { InvitationCodeEntryForm } from '@/components/forms/invitation-code-entry-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonStyles } from '@/components/ui/button';

function StepChip({ step, title, active }: { step: string; title: string; active?: boolean }) {
  return (
    <div className={`rounded-full px-4 py-2 text-sm font-medium ${active ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'}`}>
      {step}. {title}
    </div>
  );
}

export default async function SignupGuidePage({
  searchParams
}: {
  searchParams?: Promise<{ flow?: string }>;
}) {
  const auth = await getCurrentAuth();
  const resolved = searchParams ? await searchParams : undefined;
  const flow = resolved?.flow ?? '';
  const signupNext = '/start/signup';

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="space-y-8">
        <div className="space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">회원가입 안내</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">회원가입 후 필요한 가입 경로를 이어서 선택하세요.</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            카카오 또는 일반회원가입으로 계정을 만든 뒤, 의뢰인 가입, 조직 생성 신청, 조직 초대코드 연결 중 필요한 경로로 이어집니다.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <StepChip step="1" title="회원가입" active={!auth} />
            <StepChip step="2" title="경로 선택" active={Boolean(auth) && !flow} />
            <StepChip step="3" title="정보 입력 또는 요청" active={Boolean(auth) && Boolean(flow)} />
          </div>
        </div>

        {!auth ? (
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <Card className="rounded-[1.8rem] border-sky-200 bg-[linear-gradient(180deg,#f8fbff,#eef6ff)]">
              <CardHeader className="border-none pb-2">
                <CardTitle className="text-2xl">1단계. 가입 방식을 선택하세요</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    ['1', '카카오 또는 일반회원가입으로 기본 계정 생성'],
                    ['2', '로그인 직후 가입 경로 선택'],
                    ['3', '의뢰인 가입, 조직 생성 신청, 직원 연결 진행']
                  ].map(([step, title]) => (
                    <div key={step} className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-white px-4 py-3">
                      <div className="inline-flex size-9 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">{step}</div>
                      <p className="text-sm font-medium text-slate-900">{title}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm leading-7 text-slate-600">
                  카카오와 일반회원가입 모두 가입이 끝나면 이 화면으로 다시 돌아와서 의뢰인 가입, 조직 생성 신청, 조직 직원 연결 중 필요한 경로를 선택합니다.
                </p>
                <LoginButtonWithNext next={signupNext} idleLabel="카카오로 시작하기" forceLoginPrompt={false} />
              </CardContent>
            </Card>

            <Card className="rounded-[1.8rem]">
              <CardHeader className="border-none pb-2">
                <CardTitle className="text-2xl">일반회원가입</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-7 text-slate-600">이메일과 비밀번호로 회원가입해도 이후 의뢰인 가입, 조직 생성 신청, 조직 직원 연결 흐름은 동일하게 이어집니다.</p>
                <GeneralSignupForm />
              </CardContent>
            </Card>
          </div>
        ) : !flow ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="rounded-[1.8rem] border-emerald-200 bg-[linear-gradient(180deg,#f6fff9,#ebfff2)]">
              <CardHeader className="border-none pb-2">
                <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <Users className="size-6" />
                </div>
                <CardTitle className="mt-4 text-2xl">의뢰인으로 가입</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-7 text-slate-600">본인정보를 등록한 뒤, 조직에서 받은 초대번호를 입력하거나 조직가입신청으로 이어가는 경로입니다.</p>
                <Link href={'/start/signup?flow=client' as Route} className={buttonStyles({ className: 'min-h-14 w-full justify-between rounded-[1.25rem] px-5 text-base' })}>
                  의뢰인 가입 단계 보기
                  <ArrowRight className="size-4" />
                </Link>
              </CardContent>
            </Card>

            <Card className="vs-mesh-card rounded-[1.8rem]">
              <CardHeader className="border-none pb-2">
                <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                  <Building2 className="size-6" />
                </div>
                <CardTitle className="mt-4 text-2xl">조직 생성 신청</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-7 text-slate-600">법률사무소, 추심사, 금융사 등 조직 단위 운영을 시작하는 경로입니다.</p>
                <Link href={'/start/signup?flow=organization' as Route} className={buttonStyles({ className: 'min-h-14 w-full justify-between rounded-[1.25rem] px-5 text-base' })}>
                  조직 생성 신청 단계 보기
                  <ArrowRight className="size-4" />
                </Link>
              </CardContent>
            </Card>

            <Card className="rounded-[1.8rem]">
              <CardHeader className="border-none pb-2">
                <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <Link2 className="size-6" />
                </div>
                <CardTitle className="mt-4 text-2xl">조직 연결 신청 가입하기</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-7 text-slate-600">조직에서 받은 초대번호나 초대 링크가 있다면 직원 계정으로 바로 연결합니다.</p>
                <Link href={'/start/signup?flow=connection' as Route} className={buttonStyles({ variant: 'secondary', className: 'min-h-14 w-full justify-between rounded-[1.25rem] px-5 text-base' })}>
                  직원 연결 단계 보기
                  <ArrowRight className="size-4" />
                </Link>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {auth && flow === 'organization' ? (
          <Card className="rounded-[1.8rem]">
            <CardHeader className="border-none pb-2">
              <CardTitle className="text-2xl">조직 생성 신청 흐름</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ['1', '조직 정보 입력', '조직명, 사업자등록번호, 사업자등록증을 준비합니다.'],
                  ['2', '운영팀 검토', '자동 대조와 운영 검토를 거쳐 승인 여부가 결정됩니다.'],
                  ['3', '조직 워크스페이스 진입', '승인 후 조직 관리자 권한으로 운영 화면을 시작합니다.']
                ].map(([step, title, body]) => (
                  <div key={step} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Step {step}</p>
                    <p className="mt-2 font-medium text-slate-900">{title}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{body}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href={'/organization-request' as Route} className={buttonStyles({ className: 'min-h-14 justify-between rounded-[1.25rem] px-5 text-base' })}>
                  조직 생성 신청으로 이동
                  <ArrowRight className="size-4" />
                </Link>
                <Link href={'/start/signup' as Route} className={buttonStyles({ variant: 'ghost', className: 'min-h-14 rounded-[1.25rem] px-5 text-base' })}>
                  <ArrowLeft className="size-4" /> 다른 경로 보기
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {auth && flow === 'client' ? (
          <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
            <Card className="rounded-[1.8rem] border-emerald-200 bg-[linear-gradient(180deg,#f6fff9,#ebfff2)]">
              <CardHeader className="border-none pb-2">
                <CardTitle className="text-2xl">의뢰인 가입 흐름</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    ['1', '로그인 또는 일반회원가입으로 본인 세션 확보'],
                    ['2', '이름, 주민등록번호, 연락처와 필수 동의 입력'],
                    ['3', '승인 대기 상태로 전환'],
                    ['4', '초대번호 입력 또는 조직가입신청 진행']
                  ].map(([step, title]) => (
                    <div key={step} className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3">
                      <div className="inline-flex size-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">{step}</div>
                      <p className="text-sm font-medium text-slate-900">{title}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-4 text-sm leading-7 text-slate-700">
                  본인정보 등록이 끝나면 바로 사건 허브로 들어가는 것이 아니라, 조직에서 받은 초대번호를 먼저 입력해야 합니다. 아직 초대번호가 없다면 가입 후 대기 화면에서 조직가입신청하기로 이어질 수 있습니다.
                </div>
                <Link href={'/start/signup' as Route} className={buttonStyles({ variant: 'ghost', className: 'min-h-12 rounded-[1.25rem] px-4 text-base' })}>
                  <ArrowLeft className="size-4" /> 다른 경로 보기
                </Link>
              </CardContent>
            </Card>

            {!auth.profile.is_client_account ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">2단계. 본인정보 등록을 완료하면 기본 상태가 승인 대기로 전환됩니다.</div>
                <ClientSignupForm />
              </div>
            ) : (
              <Card className="rounded-[1.8rem]">
                <CardHeader className="border-none pb-2">
                  <CardTitle className="text-2xl">현재 가입 상태</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-5 text-emerald-600" />
                      <p className="font-medium text-slate-900">{clientAccountStatusLabel(auth.profile.client_account_status)}</p>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {isClientAccountPending(auth.profile)
                        ? '가입 또는 재승인 대기 상태입니다. 초대번호 입력 또는 조직가입신청하기 화면에서 현재 진행 상황을 이어갈 수 있습니다.'
                        : '이미 활성 상태입니다. 로그인 후 의뢰인 포털에서 사건과 알림을 확인할 수 있습니다.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link href={(isClientAccountPending(auth.profile) ? '/start/pending' : '/portal') as Route} className={buttonStyles({ className: 'min-h-12 rounded-[1.25rem] px-4 text-base' })}>
                      {isClientAccountPending(auth.profile) ? '대기 상태 보기' : '포털로 이동'}
                    </Link>
                    {isClientAccountPending(auth.profile) ? (
                      <Link href={'/client-access' as Route} className={buttonStyles({ variant: 'secondary', className: 'min-h-12 rounded-[1.25rem] px-4 text-base' })}>
                        조직가입신청하기
                      </Link>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}

        {auth && flow === 'connection' ? (
          <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
            <Card className="rounded-[1.8rem] border-amber-200 bg-[linear-gradient(180deg,#fffdf7,#fff7e8)]">
              <CardHeader className="border-none pb-2">
                <CardTitle className="text-2xl">조직 연결 신청 가입하기</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    ['1', '회원가입 완료', '카카오 또는 일반회원가입으로 계정을 만든 뒤 이 화면으로 돌아옵니다.'],
                    ['2', '초대번호 입력', '조직에서 받은 초대번호 또는 초대 링크를 입력합니다.'],
                    ['3', '직원 계정 연결', '초대를 수락하면 해당 조직의 직원으로 바로 연결됩니다.']
                  ].map(([step, title, body]) => (
                    <div key={step} className="rounded-2xl border border-amber-200 bg-white px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Step {step}</p>
                      <p className="mt-2 font-medium text-slate-900">{title}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{body}</p>
                    </div>
                  ))}
                </div>
                <Link href={'/start/signup' as Route} className={buttonStyles({ variant: 'ghost', className: 'min-h-12 rounded-[1.25rem] px-4 text-base' })}>
                  <ArrowLeft className="size-4" /> 다른 경로 보기
                </Link>
              </CardContent>
            </Card>

            <InvitationCodeEntryForm
              title="직원 연결용 초대번호 입력"
              description="조직 담당자가 전달한 초대번호나 초대 링크를 붙여 넣으면 초대 수락 화면으로 바로 이동합니다."
              submitLabel="직원으로 연결하기"
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}