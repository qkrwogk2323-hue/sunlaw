import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsNav } from '@/components/settings-nav';
import { findMembership, getActiveViewMode, getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { isWorkspaceAdmin } from '@/lib/permissions';
import { getOrganizationWorkspace } from '@/lib/queries/organizations';
import { getSettingsAdminData } from '@/lib/queries/settings-admin';
import { OrganizationSettingForm } from '@/components/forms/organization-setting-form';
import { PLATFORM_SCENARIO_ORGANIZATIONS, isPlatformScenarioMode } from '@/lib/platform-scenarios';

export default async function OrganizationSettingsPage() {
  const auth = await requireAuthenticatedUser();
  const activeViewMode = await getActiveViewMode();

  if (auth.profile.platform_role === 'platform_admin' && isPlatformScenarioMode(activeViewMode)) {
    const organization = PLATFORM_SCENARIO_ORGANIZATIONS[activeViewMode];

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Organization Settings</h1>
          <p className="mt-2 text-sm text-slate-600">가상조직 시야에서는 조직 설정을 읽기 전용으로 보여 줍니다. 실제 저장은 연결된 실조직이나 플랫폼 설정에서만 처리합니다.</p>
        </div>
        <SettingsNav currentPath="/settings/organization" />
        <Card>
          <CardHeader><CardTitle>{organization.name}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>조직 유형: {organization.kind ?? '-'}</p>
            <p>상태: 가상조직 시나리오</p>
            <p>정책: 이 화면에서는 실제 DB 저장 없이 조직 운영 기준 예시만 제공합니다.</p>
          </CardContent>
        </Card>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>용어/안내 예시</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>사건 보드 명칭은 조직 성격에 맞게 달라질 수 있습니다.</p>
              <p>의뢰인 포털 안내 문구와 승인 흐름은 조직마다 별도로 운영할 수 있습니다.</p>
              <p>정산/리포트/추심 모듈 노출은 활성 모듈 기준으로 달라집니다.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>활성 모듈</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {Object.entries(organization.enabled_modules ?? {}).map(([key, enabled]) => (
                <span key={key} className={`rounded-full border px-3 py-1 text-xs font-medium ${enabled ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                  {key}: {enabled ? 'ON' : 'OFF'}
                </span>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const organizationId = getEffectiveOrganizationId(auth);
  if (!organizationId) notFound();
  const membership = findMembership(auth, organizationId);
  if (!membership || !isWorkspaceAdmin(membership)) notFound();
  const [workspace, data] = await Promise.all([
    getOrganizationWorkspace(organizationId),
    getSettingsAdminData(organizationId)
  ]);
  if (!workspace) notFound();

  const orgMap = new Map(data.organizationSettings.map((row: any) => [row.key, row.value_json]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Organization Settings</h1>
        <p className="mt-2 text-sm text-slate-600">조직별 용어, 포털 안내, Billing 기본값 같은 오버라이드를 관리합니다.</p>
      </div>
      <SettingsNav currentPath="/settings/organization" />
      <Card>
        <CardHeader><CardTitle>{workspace.organization.name}</CardTitle></CardHeader>
        <CardContent className="text-sm text-slate-600">조직 단위 override가 허용된 설정만 수정할 수 있습니다.</CardContent>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        {data.catalog.filter((item: any) => item.scope === 'organization' || item.scope === 'both').map((item: any) => (
          <OrganizationSettingForm key={item.key} item={item} organizationId={organizationId} currentValue={orgMap.get(item.key)} />
        ))}
      </div>
    </div>
  );
}
