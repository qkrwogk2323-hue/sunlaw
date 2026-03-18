import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { DashboardHubClient } from '@/components/dashboard-hub-client';
import { getDashboardSnapshot } from '@/lib/queries/dashboard';

export default async function DashboardPage() {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const data = await getDashboardSnapshot(organizationId);

  return <DashboardHubClient organizationId={organizationId} currentUserId={auth.user.id} data={data} />;
}
