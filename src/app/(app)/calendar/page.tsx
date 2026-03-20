import { findMembership, getEffectiveOrganizationId, isManagementRole, requireAuthenticatedUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getCalendarBoardSnapshot } from '@/lib/queries/calendar';
import { getDashboardSnapshot } from '@/lib/queries/dashboard';
import { getCaseHubList } from '@/lib/queries/case-hubs';
import { CalendarBoardClient } from '@/components/calendar-board-client';
import { HubContextStrip } from '@/components/hub-context-strip';

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

  const [calendarSnapshot, dashboardSnapshot, hubs] = await Promise.all([
    getCalendarBoardSnapshot(organizationId, month),
    getDashboardSnapshot(organizationId),
    getCaseHubList(organizationId)
  ]);

  return (
    <div className="space-y-6">
      <HubContextStrip hubs={hubs.slice(0, 4)} currentLabel="일정 확인" />
      <CalendarBoardClient
        organizationId={organizationId}
        currentUserId={auth.user.id}
        canManage={canManage}
        snapshot={calendarSnapshot}
        caseOptions={dashboardSnapshot.caseOptions}
      />
    </div>
  );
}
