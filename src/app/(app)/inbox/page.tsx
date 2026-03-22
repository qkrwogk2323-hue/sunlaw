import Link from 'next/link';
import type { Route } from 'next';
import { ClipboardList, MessageSquareText, Users } from 'lucide-react';
import { buttonStyles } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { getCollaborationOverview } from '@/lib/queries/collaboration-hubs';

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
  const organizationId = getEffectiveOrganizationId(auth);
  const collaboration = await getCollaborationOverview(organizationId);

  return (
    <div className="space-y-6">
      <div className="vs-brand-panel overflow-hidden rounded-[1.8rem] p-6 text-white shadow-[0_24px_54px_rgba(8,47,73,0.26)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100/80">사건허브</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">협업 제안, 승인, 사건허브 대화를 한 흐름으로 관리합니다.</h1>
            <p className="mt-3 text-sm leading-7 text-slate-200/88">사건허브가 열리면 담당자 초대, 의뢰인 초대, 사건 등록, 실시간 소통을 이 메뉴에서 바로 이어갈 수 있습니다.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href={'/organizations' as Route} className="rounded-2xl border border-sky-300/40 bg-sky-500/20 p-4 backdrop-blur-sm transition hover:bg-sky-500/30">
              <ClipboardList className="size-5 text-sky-200" />
              <p className="mt-3 text-sm font-semibold text-slate-100">승인 대기 {collaboration.inboundRequests.length}건</p>
              <p className="mt-1 text-xs text-slate-200/85">
                {collaboration.inboundRequests[0]?.sourceOrganization?.name ?? '대기 없음'}
                {collaboration.inboundRequests.length > 1 ? ` 외 ${collaboration.inboundRequests.length - 1}건` : ''}
              </p>
            </Link>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm"><MessageSquareText className="size-5 text-sky-200" /><p className="mt-3 text-sm text-slate-100">사건허브 대화</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm"><Users className="size-5 text-sky-200" /><p className="mt-3 text-sm text-slate-100">담당자·의뢰인 초대</p></div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {/* BUG-AUDIT: 감사로그 직접 이동 차단 - 일반 사용자가 플랫폼 관리자 감사로그에 접근하는 버그 */}
      </div>

      <section className="grid gap-6">
        <Card className="vs-interactive vs-mesh-card">
          <CardHeader><CardTitle>열린 사건허브</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {collaboration.activeHubs.length ? collaboration.activeHubs.map((hub) => (
              <InboxCard key={hub.id} href={`/inbox/${hub.id}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{hub.partnerOrganization?.name ?? '협업 조직'} 사건허브</p>
                  <div className="flex items-center gap-2">
                    {hub.unreadCount > 0 ? <Badge tone="blue">새 메시지 {hub.unreadCount}</Badge> : null}
                    <Badge tone="green">활성</Badge>
                  </div>
                </div>
                <p className="mt-1 text-sm text-slate-500">{hub.title}</p>
                <p className="mt-2 text-sm text-slate-600 line-clamp-2">{hub.lastMessageBody ?? hub.summary ?? '첫 메시지를 시작해 허브를 열어 보세요.'}</p>
                <p className="mt-2 text-xs text-slate-400">{hub.lastMessageAt ? formatDateTime(hub.lastMessageAt) : '대화 없음'}{hub.lastMessageCaseTitle ? ` · ${hub.lastMessageCaseTitle}` : ''}</p>
              </InboxCard>
            )) : <p className="text-sm text-slate-500">아직 열린 사건허브가 없습니다.</p>}
          </CardContent>
        </Card>
      </section>
    </div>
  );

}
