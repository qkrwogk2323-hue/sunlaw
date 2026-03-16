import { getActiveViewMode, getEffectiveOrganizationId, hasActivePlatformScenarioView, requireAuthenticatedUser } from '@/lib/auth';
import { DashboardHubClient } from '@/components/dashboard-hub-client';
import { getDashboardSnapshot } from '@/lib/queries/dashboard';
import { getPlatformScenarioDashboardSnapshot, isPlatformScenarioMode } from '@/lib/platform-scenarios';

export default async function DashboardPage() {
  const auth = await requireAuthenticatedUser();
  const activeViewMode = await getActiveViewMode();
  const scenarioMode = isPlatformScenarioMode(activeViewMode) && await hasActivePlatformScenarioView(auth, activeViewMode) ? activeViewMode : null;
  const organizationId = scenarioMode ? null : getEffectiveOrganizationId(auth);
  const data = scenarioMode
    ? getPlatformScenarioDashboardSnapshot(scenarioMode)
    : await getDashboardSnapshot(organizationId);

  return <DashboardHubClient organizationId={organizationId} currentUserId={auth.user.id} scenarioMode={scenarioMode} data={data} />;
}
