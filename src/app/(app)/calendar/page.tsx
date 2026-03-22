import { Suspense } from 'react';
import { findMembership, getEffectiveOrganizationId, isManagementRole, requireAuthenticatedUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getCalendarBoardSnapshot } from '@/lib/queries/calendar';
import { getCaseOptionsForCalendar } from '@/lib/queries/dashboard';
import { getCaseHubList } from '@/lib/queries/case-hubs';
import { CalendarBoardClient } from '@/components/calendar-board-client';
import { HubContextStrip } from '@/components/hub-context-strip';
import { buildScheduleBriefing } from '@/lib/ai/schedule-briefing';

/** HubContextStrip을 deferred로 로딩하는 서버 컴포넌트 — 달력 grid가 먼저 렌더된다 */
async function CalendarHubStripAsync({ organizationId, currentLabel }: { organizationId: string | null; currentLabel: string }) {
  const hubs = organizationId ? await getCaseHubList(organizationId, 4) : [];
  return <HubContextStrip hubs={hubs} currentLabel={currentLabel} />;
}

export default async function CalendarPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const month = typeof resolvedSearchParams.month === 'string' ? resolvedSearchParams.month : null;
  const membership = organizationId ? findMembership(auth, organizationId) : null;
  const canManage = Boolean(
    organizationId && membership && (
      isManagementRole(membership.role) ||
      hasPermission(auth, organizationId, 'schedule_create') ||
      hasPermission(auth, organizationId, 'schedule_edit')
    )
  );

  // getCaseOptionsForCalendar: 단일 쿼리 (20 rows) — getDashboardSnapshot 전체 (~16 queries) 대체
  // getCaseHubList는 Suspense로 분리 → 달력 grid blocking 없이 streaming
  const [calendarSnapshot, caseOptions] = await Promise.all([
    getCalendarBoardSnapshot(organizationId, month),
    getCaseOptionsForCalendar(organizationId),
  ]);

  const briefing = buildScheduleBriefing(
    calendarSnapshot.schedules,
    calendarSnapshot.today,
    calendarSnapshot.weekEnd,
  );

  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="h-10 animate-pulse rounded-xl bg-slate-100" />}>
        <CalendarHubStripAsync organizationId={organizationId} currentLabel="일정 확인" />
      </Suspense>
      <CalendarBoardClient
        organizationId={organizationId}
        currentUserId={auth.user.id}
        canManage={canManage}
        snapshot={calendarSnapshot}
        caseOptions={caseOptions}
        briefing={briefing}
      />
    </div>
  );
}
