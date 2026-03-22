import { redirect } from 'next/navigation';
import { getDefaultAppRoute, getEffectiveOrganizationId, getPlatformOrganizationContextId, hasActivePlatformAdminView, isManagementRole, requireAuthenticatedUser } from '@/lib/auth';
import { buildDashboardAiOverview } from '@/lib/ai/dashboard-home';
import { DashboardHubClient } from '@/components/dashboard-hub-client';
import { getDashboardSnapshot } from '@/lib/queries/dashboard';

export default async function DashboardPage() {
  const auth = await requireAuthenticatedUser();
  if (getDefaultAppRoute(auth) !== '/dashboard') {
    redirect(getDefaultAppRoute(auth));
  }
  const organizationId = getEffectiveOrganizationId(auth);
  const data = await getDashboardSnapshot(organizationId);
  const isPlatformAdmin = await hasActivePlatformAdminView(auth, getPlatformOrganizationContextId(auth));
  const currentMembership = auth.memberships.find((membership) => membership.organization_id === organizationId) ?? null;
  const roleLabel = isPlatformAdmin
    ? '플랫폼 관리자'
    : isManagementRole(currentMembership?.role)
    ? '조직 관리자'
    : '조직 구성원';
  const initialAiOverview = buildDashboardAiOverview({
    organizationId,
    snapshot: data,
    isPlatformAdmin,
    roleLabel
  });

  return (
    <DashboardHubClient
      organizationId={organizationId}
      currentUserId={auth.user.id}
      data={data}
      isPlatformAdmin={isPlatformAdmin}
      initialAiOverview={initialAiOverview}
    />
  );
}
