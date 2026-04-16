/**
 * Dashboard Hub Overview — 참여 허브 모음 뷰 (2026-04-16).
 *
 * 리뷰어 판정: "대시보드는 여러 방의 현관. 사건별 한 줄 요약 N개 + 오늘 할 일."
 * 이 컴포넌트는 기존 `DashboardHubClient`의 카드 조합 **위**에 배치되어,
 * 참여 중인 사건 허브들을 한 줄씩 표시한다. 각 줄 클릭 → 해당 사건 허브로 이동.
 *
 * 데이터 원천: `getCaseHubList(organizationId)` — 이미 존재하는 projection 쿼리.
 * 페이지-spec: `docs/page-specs/dashboard.md` §1.1 (허브 모음 뷰).
 *
 * 서버 컴포넌트 — 이벤트 핸들러 없음, Link 렌더만.
 */
import type { Route } from 'next';
import Link from 'next/link';
import { ChevronRight, Clock, Activity, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ROUTES } from '@/lib/routes/registry';
import { formatHubRelativeActivity, getHubReadinessStateLabel } from '@/lib/case-hub-metrics';
import type { CaseHubSummary } from '@/lib/queries/case-hubs';

interface DashboardHubOverviewProps {
  hubs: CaseHubSummary[];
  /** 사건별 미납 카운트 맵 (billing projection 선택적 연동). 없으면 0 표시. */
  overdueMap?: Record<string, number>;
}

export function DashboardHubOverview({ hubs, overdueMap }: DashboardHubOverviewProps) {
  if (!hubs.length) {
    return (
      <Card className="rounded-[1.8rem] border-slate-200/80 bg-white/95">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">참여 허브</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center">
            <p className="text-sm font-medium text-slate-500">참여 중인 사건 허브가 없습니다.</p>
            <p className="mt-1 text-xs text-slate-400">
              사건 목록에서 "허브 연동"을 눌러 허브를 만들거나, 초대를 수락하면 여기에 나타납니다.
            </p>
            <Link
              href={ROUTES.CASES}
              className="mt-3 inline-block text-xs font-semibold text-sky-700 underline-offset-2 hover:underline"
            >
              사건 목록으로 이동 →
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[1.8rem] border-slate-200/80 bg-white/95">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">
          참여 허브 <span className="ml-1 text-sm font-normal text-slate-500">{hubs.length}개</span>
        </CardTitle>
        <Link
          href={ROUTES.CASES}
          className="text-xs font-semibold text-sky-700 hover:text-sky-900"
          aria-label="사건 전체 보기"
        >
          전체 보기 →
        </Link>
      </CardHeader>
      <CardContent className="divide-y divide-slate-100 px-0">
        {hubs.map((hub) => {
          const overdue = overdueMap?.[hub.caseId] ?? 0;
          const readinessLabel = getHubReadinessStateLabel(hub.readinessPercent);
          const activityLabel = formatHubRelativeActivity(hub.lastActivityAt);
          return (
            <Link
              key={hub.id}
              href={`${ROUTES.CASE_HUBS}/${hub.id}` as Route}
              className="flex items-center gap-4 px-5 py-3 transition hover:bg-slate-50/60"
              aria-label={`${hub.caseTitle ?? '사건'} 허브 입장`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold text-slate-900">
                    {hub.caseTitle ?? '(제목 없음)'}
                  </span>
                  {hub.caseReferenceNo && (
                    <span className="text-[11px] text-slate-400">{hub.caseReferenceNo}</span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Activity className="size-3 text-sky-600" aria-hidden="true" />
                    준비 {hub.readinessPercent}% · {readinessLabel}
                  </span>
                  {hub.unreadCount > 0 ? (
                    <Badge tone="amber">미읽음 {hub.unreadCount}</Badge>
                  ) : null}
                  {overdue > 0 ? (
                    <span className="inline-flex items-center gap-1 text-rose-600">
                      <AlertCircle className="size-3" aria-hidden="true" /> 미납 {overdue}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <Clock className="size-3" aria-hidden="true" />
                    {activityLabel}
                  </span>
                </div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-slate-300" aria-hidden="true" />
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
