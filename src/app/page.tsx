import Link from 'next/link';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { ArrowRight, BellRing, Building2, ClipboardList, FolderKanban, Landmark, MessageSquareText, Scale, ShieldCheck, Wallet } from 'lucide-react';
import { BrandBanner } from '@/components/brand-banner';
import { HomepageDemoVideo } from '@/components/homepage-demo-video';
import { buttonStyles } from '@/components/ui/button';
import { getCurrentAuth, getEffectiveOrganizationId } from '@/lib/auth';
import { signOutAction } from '@/lib/actions/auth-actions';
import { getDashboardSnapshot } from '@/lib/queries/dashboard';

const expertMindMap = [
  {
    title: '법률',
    description: '대응 전략, 문서 검토, 법적 절차를 담당합니다.',
    icon: Scale,
    tone: 'text-sky-200 bg-sky-400/14'
  },
  {
    title: '추심',
    description: '회수 활동과 실행 흐름을 현장에서 이어갑니다.',
    icon: Wallet,
    tone: 'text-emerald-200 bg-emerald-400/14'
  },
  {
    title: '보험',
    description: '보상 검토와 관련 기관 협의를 연결합니다.',
    icon: ShieldCheck,
    tone: 'text-cyan-200 bg-cyan-400/14'
  },
  {
    title: '금융',
    description: '채권, 정산, 자금 흐름과 결제를 점검합니다.',
    icon: Landmark,
    tone: 'text-amber-200 bg-amber-400/14'
  },
  {
    title: '부동산',
    description: '담보, 자산, 부동산 관련 실무를 함께 다룹니다.',
    icon: Building2,
    tone: 'text-indigo-200 bg-indigo-400/14'
  }
];

function greetingLabel(fullName?: string | null) {
  const name = fullName?.trim() || '고객';
  return `${name} 님! 반갑습니다.`;
}

export default async function MarketingPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  if (typeof resolvedSearchParams?.code === 'string' && resolvedSearchParams.code) {
    const callbackSearchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(resolvedSearchParams)) {
      if (typeof value === 'string' && value) {
        callbackSearchParams.set(key, value);
      }
    }

    redirect(`/auth/callback?${callbackSearchParams.toString()}` as Route);
  }

  const auth = await getCurrentAuth();
  const startHref = (auth ? '/dashboard' : '/start') as Route;
  const organizationId = auth ? getEffectiveOrganizationId(auth) : null;
  const dashboard = auth ? await getDashboardSnapshot(organizationId) : null;
  const caseAttentionCount = dashboard ? dashboard.pendingDocuments + dashboard.pendingRequests : 0;
  const heroSectionClassName = auth ? 'relative mx-auto max-w-7xl px-6 pt-20 pb-10 lg:pt-24 lg:pb-12' : 'relative mx-auto max-w-7xl px-6 py-20 lg:py-24';

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <section className={heroSectionClassName}>
        <div className="relative z-10 flex flex-col items-center gap-8 text-center">
          <BrandBanner href={'/' as Route} className="mx-auto w-full max-w-7xl" theme="dark" />
          <div className="grid w-full max-w-7xl gap-4 lg:grid-cols-[1.32fr_1fr] lg:items-center">
            <Link
              href={startHref}
              className={buttonStyles({
                size: 'lg',
                className:
                  'h-20 w-full rounded-[1.7rem] px-10 text-2xl font-extrabold tracking-[-0.02em] bg-[linear-gradient(135deg,#b45309_0%,#d97706_18%,#f59e0b_54%,#facc15_100%)] text-slate-950 shadow-[0_24px_54px_rgba(217,119,6,0.42)] hover:bg-[linear-gradient(135deg,#92400e_0%,#b45309_22%,#d97706_58%,#eab308_100%)]'
              })}
            >
              시작하기
              <ArrowRight className="ml-3 size-6" />
            </Link>

            {auth ? (
              <div className="grid h-20 w-full grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-[1.7rem] border border-white/12 bg-white/10 px-5 text-center backdrop-blur-sm">
                <div />
                <div className="justify-self-center">
                  <p className="text-lg font-semibold text-white">{greetingLabel(auth.profile.full_name)}</p>
                </div>
                <form action={signOutAction} className="justify-self-end">
                  <button className={buttonStyles({ variant: 'secondary', className: 'min-h-12 rounded-[1.1rem] px-5 text-base font-semibold whitespace-nowrap' })}>
                    로그아웃
                  </button>
                </form>
              </div>
            ) : null}
          </div>

          {auth && dashboard ? (
            <div className="flex w-full max-w-5xl flex-col items-stretch justify-center gap-4 lg:flex-row lg:items-stretch">
              <Link
                href={'/notifications' as Route}
                className="vs-pop-card flex min-h-20 w-full max-w-2xl flex-1 items-center justify-between gap-4 rounded-[1.7rem] border border-sky-300/18 bg-[linear-gradient(135deg,rgba(16,52,88,0.88),rgba(9,24,49,0.94))] px-6 py-5 text-left shadow-[0_20px_52px_rgba(14,116,144,0.24)]"
              >
                <div className="flex items-center gap-4">
                  <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-sky-300/14 text-sky-100">
                    <BellRing className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-sky-100/76">알림</p>
                    <p className="mt-1 text-2xl font-semibold text-white">확인할 알림 {dashboard.unreadNotifications}개</p>
                    <p className="mt-1 text-sm text-slate-300">새로 들어온 소식과 확인 대기 알림을 바로 볼 수 있습니다.</p>
                  </div>
                </div>
                <ArrowRight className="hidden size-5 text-sky-100/72 lg:block" />
              </Link>

              <Link
                href={'/cases' as Route}
                className="vs-pop-card flex min-h-20 w-full max-w-md items-center justify-between gap-4 rounded-[1.7rem] border border-white/12 bg-white/10 px-5 py-5 text-left backdrop-blur-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-white/10 text-amber-100">
                    <FolderKanban className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200/78">사건</p>
                    <p className="mt-1 text-2xl font-semibold text-white">확인할 건 {caseAttentionCount}개</p>
                    <p className="mt-1 text-sm text-slate-300">요청 {dashboard.pendingRequests}건, 결재 대기 {dashboard.pendingDocuments}건</p>
                  </div>
                </div>
              </Link>
            </div>
          ) : null}

          <div className="w-full max-w-7xl">
            <div className="overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(145deg,rgba(15,23,42,0.92),rgba(8,32,58,0.96))] p-2 sm:p-3 shadow-[0_28px_64px_rgba(8,47,73,0.3)]">
              <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950">
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-[linear-gradient(180deg,rgba(2,6,23,0.68),rgba(2,6,23,0))]" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-[linear-gradient(180deg,rgba(2,6,23,0),rgba(2,6,23,0.68))]" />
                <div className="h-[250px] sm:h-[310px] lg:h-[380px]">
                  <HomepageDemoVideo />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.9),rgba(8,32,58,0.94))] p-6 shadow-[0_28px_64px_rgba(8,47,73,0.28)]">
          <div className="border-b border-white/10 pb-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200/72">전문가 협업 마인드맵</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">필요한 전문가들이 한 사건에 모이고, 의뢰인과의 소통까지 하나로 이어집니다.</h2>
            <p className="mx-auto mt-3 max-w-4xl text-sm leading-7 text-slate-300">
              법률, 추심, 보험, 금융, 부동산 실무는 실제 현장에서 자주 함께 움직입니다. VEIN SPIRAL은 이 연결을 한 사건 안으로 모아,
              전문가 간 협업과 의뢰인과의 사건 진행 소통이 끊기지 않게 이어지도록 설계됩니다.
            </p>
          </div>

          <div className="relative mt-6">
            <div className="pointer-events-none absolute left-1/2 top-24 hidden h-[calc(100%-9rem)] w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(110,231,255,0),rgba(110,231,255,0.72),rgba(110,231,255,0))] lg:block" />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {expertMindMap.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="vs-pop-card relative flex flex-col items-center rounded-3xl border border-white/10 bg-white/5 p-5 text-center backdrop-blur-sm">
                    <div className={`inline-flex rounded-2xl p-3 ${item.tone}`}>
                      <Icon className="size-6" />
                    </div>
                    <h3 className="mt-5 text-2xl font-semibold text-white">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{item.description}</p>
                    <div className="pointer-events-none absolute bottom-[-1rem] left-1/2 hidden h-4 w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(110,231,255,0.65),rgba(110,231,255,0))] xl:block" />
                  </div>
                );
              })}
            </div>

            <div className="mx-auto mt-6 max-w-3xl rounded-[1.8rem] border border-sky-300/18 bg-[linear-gradient(135deg,rgba(24,44,78,0.92),rgba(10,27,55,0.94))] p-6 text-center shadow-[0_20px_48px_rgba(8,47,73,0.24)]">
              <div className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-sky-400/14 text-sky-200">
                <ClipboardList className="size-6" />
              </div>
              <h3 className="mt-4 text-2xl font-semibold text-white">하나의 공동 사건 흐름</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                전문가별 판단과 처리 내용이 하나의 사건 보드 안으로 모여, 문서 검토부터 요청 처리와 청구 확인까지 한 흐름으로 이어집니다.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {['문서 검토', '일정 공유', '요청 처리', '진행 상황 처리', '청구 확인'].map((label) => (
                  <span key={label} className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs font-medium text-slate-200">
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="pointer-events-none absolute left-1/2 top-[calc(50%+8rem)] hidden h-12 w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(110,231,255,0),rgba(110,231,255,0.72))] xl:block" />

            <div className="mx-auto mt-6 grid max-w-5xl gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[1.5rem] border border-emerald-300/16 bg-[linear-gradient(135deg,rgba(8,54,70,0.88),rgba(10,74,84,0.72))] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100/75">전문가 간 협업</p>
                <div className="mt-4 space-y-3">
                  {['법률과 추심이 함께 전략을 세움', '보험·금융·부동산 정보가 같은 사건 흐름으로 모임', '조직별 실무가 흩어지지 않고 이어짐'].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-slate-100">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-sky-300/20 bg-[linear-gradient(135deg,rgba(14,165,164,0.22),rgba(56,189,248,0.12))] p-5">
                <div className="flex items-center gap-3">
                  <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-white/10 text-sky-100">
                    <MessageSquareText className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-100/75">사건 진행 소통</p>
                    <h3 className="mt-1 text-2xl font-semibold text-white">의뢰인은 진행을 함께 이어가는 소통 주체입니다.</h3>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {['진행 상황을 확인하고 필요한 요청에 바로 응답', '자료 전달과 메시지 소통을 같은 흐름에서 처리', '사건이 어디까지 왔는지 전문가와 같은 맥락으로 이해'].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-slate-100">
                      {item}
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl bg-slate-950/36 px-4 py-3 text-sm text-sky-50">
                  “서류 요청 확인했습니다. 오늘 바로 올리고 진행 메모도 남기겠습니다.”
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
