import { requireAuthenticatedUser, getEffectiveOrganizationId, findMembership, isManagementRole } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getCalendarBoardSnapshot } from '@/lib/queries/calendar';
import { getCaseOptionsForCalendar } from '@/lib/queries/dashboard';
import { CalendarBoardClient } from '@/components/calendar-board-client';
import { buildScheduleBriefing } from '@/lib/ai/schedule-briefing';
import { bulkUploadSchedulesAction } from '@/lib/actions/bulk-upload-actions';

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

  // 동일 서버리스 함수 내 Supabase REST 병렬 호출 — Vercel 함수 동시성과 무관
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
        bulkUploadAction={bulkUploadSchedulesAction}
      />
    </div>
  );
}
