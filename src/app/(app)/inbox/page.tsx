import Link from 'next/link';
import type { Route } from 'next';
import { BellRing, ClipboardList, MessageSquareText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getActiveViewMode, getEffectiveOrganizationId, hasActivePlatformScenarioView, requireAuthenticatedUser } from '@/lib/auth';
import { getInboxSnapshot } from '@/lib/queries/inbox';
import { formatDateTime } from '@/lib/format';
import { getPlatformScenarioInboxSnapshot, isPlatformScenarioMode } from '@/lib/platform-scenarios';

function InboxCard({
  href,
  children
}: {
  href?: string;
  children: React.ReactNode;
}) {
  const className = 'vs-interactive block rounded-xl border border-slate-200 bg-white/85 p-4 transition hover:border-slate-900';

  if (!href) {
    return <div className={className}>{children}</div>;
  }

  return <Link href={href as Route} className={className}>{children}</Link>;
}

export default async function InboxPage() {
  const auth = await requireAuthenticatedUser();
  const activeViewMode = await getActiveViewMode();
  const scenarioMode = isPlatformScenarioMode(activeViewMode) && await hasActivePlatformScenarioView(auth, activeViewMode) ? activeViewMode : null;
  const organizationId = scenarioMode ? null : getEffectiveOrganizationId(auth);
  const data = scenarioMode
    ? getPlatformScenarioInboxSnapshot(scenarioMode)
    : await getInboxSnapshot(organizationId);

  return (
    <div className="space-y-6">
      <div className="vs-brand-panel overflow-hidden rounded-[1.8rem] p-6 text-white shadow-[0_24px_54px_rgba(8,47,73,0.26)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-100/75">업무 허브</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">메시지, 요청, 결재, 알림을 하나의 흐름으로 정리합니다.</h1>
            <p className="mt-3 text-sm leading-7 text-slate-200/88">지금 처리할 일과 최근 대화가 한 화면에서 이어져 다음 액션을 바로 선택할 수 있습니다.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm"><ClipboardList className="size-5 text-sky-200" /><p className="mt-3 text-sm text-slate-100">요청과 결재</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm"><MessageSquareText className="size-5 text-sky-200" /><p className="mt-3 text-sm text-slate-100">최근 대화</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm"><BellRing className="size-5 text-sky-200" /><p className="mt-3 text-sm text-slate-100">확인 대기 알림</p></div>
          </div>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="vs-interactive vs-mesh-card">
          <CardHeader><CardTitle>미처리 요청</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.requests.length ? data.requests.map((item: any) => (
              <InboxCard key={item.id} href={scenarioMode ? undefined : `/cases/${item.case_id}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <Badge tone="amber">{item.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">{item.request_kind} · {item.cases?.title ?? '-'}</p>
                <p className="mt-2 text-xs text-slate-400">{formatDateTime(item.created_at)}</p>
              </InboxCard>
            )) : <p className="text-sm text-slate-500">대기 중인 요청이 없습니다.</p>}
          </CardContent>
        </Card>

        <Card className="vs-interactive">
          <CardHeader><CardTitle>최근 대화</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.messages.length ? data.messages.map((item: any) => (
              <InboxCard key={item.id} href={scenarioMode ? undefined : `/cases/${item.case_id}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{item.cases?.title ?? '사건'}</p>
                  <Badge tone={item.is_internal ? 'slate' : 'blue'}>{item.is_internal ? '내부' : '외부'}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600 line-clamp-2">{item.body}</p>
                <p className="mt-2 text-xs text-slate-400">{formatDateTime(item.created_at)}</p>
              </InboxCard>
            )) : <p className="text-sm text-slate-500">최근 대화가 없습니다.</p>}
          </CardContent>
        </Card>

        <Card className="vs-interactive">
          <CardHeader><CardTitle>결재 대기</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.approvals.length ? data.approvals.map((item: any) => (
              <InboxCard key={item.id} href={scenarioMode ? undefined : `/cases/${item.case_id}`}>
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm text-slate-500">{item.cases?.title ?? '-'}</p>
                <p className="mt-2 text-xs text-slate-400">{formatDateTime(item.updated_at)}</p>
              </InboxCard>
            )) : <p className="text-sm text-slate-500">결재 대기 문서가 없습니다.</p>}
          </CardContent>
        </Card>

        <Card className="vs-interactive">
          <CardHeader><CardTitle>미확인 알림</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.notifications.length ? data.notifications.map((item: any) => (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-white/85 p-4">
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm text-slate-500">{item.body}</p>
                <p className="mt-2 text-xs text-slate-400">{formatDateTime(item.created_at)}</p>
              </div>
            )) : <p className="text-sm text-slate-500">미확인 알림이 없습니다.</p>}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
