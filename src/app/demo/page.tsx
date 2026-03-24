import Link from 'next/link';
import type { Route } from 'next';
import { ArrowRight, Bell, BriefcaseBusiness, Building2, CreditCard, FileText, FolderKanban, MessageSquareShare, ScrollText, ShieldCheck, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { DEMO_ROLES, DEMO_SHARED_HUB, getDemoRoleHref, getDemoRoleView, type DemoRole } from '@/lib/demo/workspace-demo';

/**
 * @rule-meta-start
 * surfaceScope: public
 * requiresAuth: false
 * requiresTraceability: false
 * traceEntity: public_workspace_demo
 * @rule-meta-end
 */
export const dynamic = 'force-static';

function toneClasses(tone: 'blue' | 'amber' | 'emerald' | 'rose') {
  switch (tone) {
    case 'amber':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    case 'emerald':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    case 'rose':
      return 'border-rose-200 bg-rose-50 text-rose-900';
    default:
      return 'border-sky-200 bg-sky-50 text-sky-900';
  }
}

export default async function DemoWorkspacePage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const roleParam = typeof resolvedSearchParams.role === 'string' ? resolvedSearchParams.role : 'law';
  const role = (DEMO_ROLES.some((item) => item.key === roleParam) ? roleParam : 'law') as DemoRole;
  const roleView = getDemoRoleView(role);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff,#eef5ff)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6">
        <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#111827,#334155)] p-6 text-white shadow-[0_24px_64px_rgba(15,23,42,0.18)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">공개 데모</p>
              <h1 className="text-3xl font-semibold tracking-tight">법률사무소 · 추심조직 · 의뢰인 탐방 화면</h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-200">
                로그인 없이 역할별 화면과 같은 사건의 허브 연동 모습을 읽기 전용으로 둘러보는 데모입니다. 저장이나 실제 전송은 일어나지 않습니다.
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-xs leading-5 text-slate-100">
              이 데모는 <span className="font-semibold">src/app/demo</span> 와 <span className="font-semibold">src/lib/demo</span>만 지우면 함께 제거됩니다.
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[16rem_minmax(0,1fr)]">
          <aside className="space-y-4 rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">역할 선택</p>
              {DEMO_ROLES.map((item) => {
                const active = role === item.key;
                return (
                  <Link
                    key={item.key}
                    href={getDemoRoleHref(item.key)}
                    className={`block rounded-2xl border px-4 py-4 transition ${
                      active
                        ? 'border-sky-300 bg-sky-50 shadow-[0_10px_20px_rgba(14,165,233,0.10)]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <p className="font-semibold text-slate-900">{item.label}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
                  </Link>
                );
              })}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">현재 보기</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{roleView.persona}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{roleView.subtitle}</p>
            </div>
          </aside>

          <main className="space-y-6">
            <Card className="border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl">{roleView.title}</CardTitle>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    같은 사건을 기준으로 역할마다 메뉴와 시야가 어떻게 달라지는지 바로 볼 수 있습니다.
                  </p>
                </div>
                <Badge tone="blue">읽기 전용</Badge>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">집중 사건</p>
                  <p className="mt-3 text-lg font-semibold text-slate-950">{roleView.caseFocus.title}</p>
                  <p className="mt-2 text-sm text-slate-600">{DEMO_SHARED_HUB.caseNumber} · {roleView.caseFocus.stage}</p>
                  <p className="mt-2 text-sm text-slate-600">{roleView.caseFocus.client} · {roleView.caseFocus.amount}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <ShieldCheck className="size-4 text-emerald-600" />
                    사건허브 / 조직간 허브
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    법률사무소, 추심조직, 의뢰인이 같은 사건을 서로 다른 화면으로 보되 허브 메시지는 같은 흐름을 공유하는 데모입니다.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Bell className="size-4 text-sky-600" />
                    알림 / 일정 / 비용
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    역할에 따라 같은 일정과 비용 이슈가 다르게 보이는 흐름을 샘플 카드로 확인할 수 있습니다.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Card className="border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                <CardHeader>
                  <CardTitle>메뉴 탐방</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {roleView.menus.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-slate-900">{item.label}</p>
                        <ArrowRight className="size-4 text-slate-400" />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{item.note}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                <CardHeader>
                  <CardTitle>역할별 알림</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {roleView.alerts.map((item) => (
                    <div key={item.title} className={`rounded-2xl border px-4 py-4 ${toneClasses(item.tone)}`}>
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 opacity-90">{item.detail}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <Card className="border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                <CardHeader>
                  <CardTitle>오늘 해야 할 일</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {roleView.tasks.map((item) => (
                    <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-slate-900">{item.title}</p>
                        <Badge tone="slate">{item.state}</Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{item.detail}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                <CardHeader>
                  <CardTitle>허브 연동 모습</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{DEMO_SHARED_HUB.caseTitle}</p>
                        <p className="mt-1 text-sm text-slate-500">{DEMO_SHARED_HUB.caseNumber} · {DEMO_SHARED_HUB.status}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {DEMO_SHARED_HUB.participants.map((item) => (
                          <Badge key={item} tone="blue">{item}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {DEMO_SHARED_HUB.messages.map((item) => (
                    <div key={`${item.source}:${item.actor}:${item.at}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <Badge tone={item.source === '의뢰인 포털' ? 'green' : item.source === '조직간 허브' ? 'amber' : 'blue'}>
                          {item.source}
                        </Badge>
                        <span>{item.actor}</span>
                        <span>{item.at}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700">{item.body}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {[
                { label: '사건 진행', icon: FolderKanban, value: role === 'client' ? '내 사건 1건' : '활성 사건 14건' },
                { label: '비용 흐름', icon: CreditCard, value: role === 'client' ? '미납 330,000원' : '분납 검토 3건' },
                { label: '문서', icon: FileText, value: role === 'client' ? '제출 요청 2건' : '검토 대기 5건' },
                { label: '허브', icon: MessageSquareShare, value: role === 'client' ? '요청 2건' : '활성 허브 4건' }
              ].map((item) => (
                <Card key={item.label} className="border-slate-200 bg-white/95 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <item.icon className="size-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end">
              <Link href={'/login' as Route} className={buttonStyles({ variant: 'secondary', className: 'min-h-11 rounded-xl px-4' })}>
                로그인 화면으로 가기
              </Link>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
