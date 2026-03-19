import Link from 'next/link';
import type { Route } from 'next';
import { BellRing, ClipboardList, MessageSquareText, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { getCollaborationOverview } from '@/lib/queries/collaboration-hubs';
import { getInboxSnapshot } from '@/lib/queries/inbox';

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

function requestStatusTone(status: string) {
  if (status === 'approved') return 'green';
  if (status === 'rejected') return 'red';
  return 'amber';
}

function requestStatusLabel(status: string) {
  if (status === 'approved') return '승인 완료';
  if (status === 'rejected') return '반려';
  if (status === 'withdrawn') return '철회';
  return '검토 대기';
}

export default async function InboxPage() {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const [data, collaboration] = await Promise.all([
    getInboxSnapshot(organizationId),
    getCollaborationOverview(organizationId)
  ]);

  return (
    <div className="space-y-6">
      <div className="vs-brand-panel overflow-hidden rounded-[1.8rem] p-6 text-white shadow-[0_24px_54px_rgba(8,47,73,0.26)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-100/75">업무 허브</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">협업 제안, 승인, 허브 대화를 한 흐름으로 관리합니다.</h1>
            <p className="mt-3 text-sm leading-7 text-slate-200/88">상대 조직과 허브가 열리면 담당자 초대, 의뢰인 초대, 사건 연결, 회의성 대화를 이 메뉴에서 바로 이어갈 수 있습니다.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm"><ClipboardList className="size-5 text-sky-200" /><p className="mt-3 text-sm text-slate-100">협업 제안 승인</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm"><MessageSquareText className="size-5 text-sky-200" /><p className="mt-3 text-sm text-slate-100">허브 대화</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm"><Users className="size-5 text-sky-200" /><p className="mt-3 text-sm text-slate-100">담당자·의뢰인 초대</p></div>
          </div>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="vs-interactive vs-mesh-card">
          <CardHeader><CardTitle>열린 업무 허브</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {collaboration.activeHubs.length ? collaboration.activeHubs.map((hub) => (
              <InboxCard key={hub.id} href={`/inbox/${hub.id}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{hub.partnerOrganization?.name ?? '협업 조직'} 허브</p>
                  <div className="flex items-center gap-2">
                    {hub.unreadCount > 0 ? <Badge tone="blue">새 메시지 {hub.unreadCount}</Badge> : null}
                    <Badge tone="green">활성</Badge>
                  </div>
                </div>
                <p className="mt-1 text-sm text-slate-500">{hub.title}</p>
                <p className="mt-2 text-sm text-slate-600 line-clamp-2">{hub.lastMessageBody ?? hub.summary ?? '첫 메시지를 시작해 허브를 열어 보세요.'}</p>
                <p className="mt-2 text-xs text-slate-400">{hub.lastMessageAt ? formatDateTime(hub.lastMessageAt) : '대화 없음'}{hub.lastMessageCaseTitle ? ` · ${hub.lastMessageCaseTitle}` : ''}</p>
              </InboxCard>
            )) : <p className="text-sm text-slate-500">아직 열린 업무 허브가 없습니다.</p>}
          </CardContent>
        </Card>

        <Card className="vs-interactive">
          <CardHeader><CardTitle>승인 대기 협업 제안</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {collaboration.inboundRequests.length ? collaboration.inboundRequests.map((item) => (
              <InboxCard key={item.id} href={`/organizations/${organizationId}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{item.sourceOrganization?.name ?? '상대 조직'} · {item.title}</p>
                  <Badge tone={requestStatusTone(item.status)}>{requestStatusLabel(item.status)}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600 line-clamp-2">{item.proposalNote ?? '메모 없음'}</p>
                <p className="mt-2 text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
              </InboxCard>
            )) : <p className="text-sm text-slate-500">검토할 협업 제안이 없습니다.</p>}
          </CardContent>
        </Card>

        <Card className="vs-interactive">
          <CardHeader><CardTitle>미처리 요청</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.requests.length ? data.requests.map((item: any) => (
              <InboxCard key={item.id} href={`/cases/${item.case_id}`}>
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
          <CardHeader><CardTitle>최근 사건 대화</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.messages.length ? data.messages.map((item: any) => (
              <InboxCard key={item.id} href={`/cases/${item.case_id}`}>
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
              <InboxCard key={item.id} href={`/cases/${item.case_id}`}>
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
