import { findMembership, getEffectiveOrganizationId, isManagementRole, requireAuthenticatedUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getCalendarBoardSnapshot } from '@/lib/queries/calendar';
import { getCaseOptionsForCalendar } from '@/lib/queries/dashboard';
import { getCaseHubList } from '@/lib/queries/case-hubs';
import { CalendarBoardClient } from '@/components/calendar-board-client';
import { HubContextStrip } from '@/components/hub-context-strip';
import { buildScheduleBriefing } from '@/lib/ai/schedule-briefing';

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
  // getCaseHubList limit 4: HubContextStrip에 4개만 필요
  const [calendarSnapshot, caseOptions, hubs] = await Promise.all([
    getCalendarBoardSnapshot(organizationId, month),
    getCaseOptionsForCalendar(organizationId),
    organizationId ? getCaseHubList(organizationId, 4) : Promise.resolve([])
  ]);

  const briefing = buildScheduleBriefing(
    calendarSnapshot.schedules,
    calendarSnapshot.today,
    calendarSnapshot.weekEnd,
  );

  return (
    <div className="space-y-6">
      <HubContextStrip hubs={hubs} currentLabel="일정 확인" />
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
