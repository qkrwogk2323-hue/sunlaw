import { findMembership, getActiveViewMode, getEffectiveOrganizationId, hasActivePlatformScenarioView, isManagementRole, requireAuthenticatedUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getCalendarBoardSnapshot } from '@/lib/queries/calendar';
import { getDashboardSnapshot } from '@/lib/queries/dashboard';
import { CalendarBoardClient } from '@/components/calendar-board-client';
import { getPlatformScenarioDashboardSnapshot, isPlatformScenarioMode } from '@/lib/platform-scenarios';
import { getPlatformScenarioCalendar } from '@/lib/platform-scenario-workspace';

export default async function CalendarPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await requireAuthenticatedUser();
  const activeViewMode = await getActiveViewMode();
  const scenarioMode = isPlatformScenarioMode(activeViewMode) && await hasActivePlatformScenarioView(auth, activeViewMode) ? activeViewMode : null;
  const organizationId = scenarioMode ? null : getEffectiveOrganizationId(auth);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const month = typeof resolvedSearchParams.month === 'string' ? resolvedSearchParams.month : null;
  const membership = organizationId ? findMembership(auth, organizationId) : null;
  const canManage = Boolean(
    !scenarioMode && organizationId && membership && (
      isManagementRole(membership.role) ||
      hasPermission(auth, organizationId, 'schedule_create') ||
      hasPermission(auth, organizationId, 'schedule_edit')
    )
  );

  const [calendarSnapshot, dashboardSnapshot] = scenarioMode
    ? [getPlatformScenarioCalendar(scenarioMode, month), getPlatformScenarioDashboardSnapshot(scenarioMode)]
    : await Promise.all([
        getCalendarBoardSnapshot(organizationId, month),
        getDashboardSnapshot(organizationId)
      ]);

  return (
    <CalendarBoardClient
      organizationId={organizationId}
      currentUserId={auth.user.id}
      canManage={canManage}
      snapshot={calendarSnapshot}
      caseOptions={dashboardSnapshot.caseOptions}
    />
  );
}