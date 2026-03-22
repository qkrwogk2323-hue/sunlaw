import { requireAuthenticatedUser, getEffectiveOrganizationId, findMembership, isManagementRole } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getCalendarBoardSnapshot } from '@/lib/queries/calendar';
import { getCaseOptionsForCalendar } from '@/lib/queries/dashboard';
import { CalendarBoardClient } from '@/components/calendar-board-client';
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
