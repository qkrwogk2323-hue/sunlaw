import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsNav } from '@/components/settings-nav';
import { findMembership, getEffectiveOrganizationId, hasActivePlatformAdminView, requireAuthenticatedUser } from '@/lib/auth';
import { isWorkspaceAdmin } from '@/lib/permissions';
import { getSettingsAdminData } from '@/lib/queries/settings-admin';
import { ContentResourceForm } from '@/components/forms/content-resource-form';

export default async function ContentResourcesPage() {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const membership = organizationId ? findMembership(auth, organizationId) : null;
  const canManageOrg = Boolean(membership && isWorkspaceAdmin(membership));
  const canManagePlatform = await hasActivePlatformAdminView(auth);
  if (!canManageOrg && !canManagePlatform) notFound();
  const data = await getSettingsAdminData(organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Content Resources</h1>
        <p className="mt-2 text-sm text-slate-600">랜딩 카피, 포털 문구, 이메일 제목, 조직별 용어를 관리합니다.</p>
      </div>
      <SettingsNav currentPath="/settings/content" />
      {canManageOrg && organizationId ? (
        <Card>
          <CardHeader><CardTitle>조직별 문구 추가</CardTitle></CardHeader>
          <CardContent><ContentResourceForm organizationId={organizationId} /></CardContent>
        </Card>
      ) : null}
      {canManagePlatform ? (
        <Card>
          <CardHeader><CardTitle>플랫폼 공통 문구 추가</CardTitle></CardHeader>
          <CardContent><ContentResourceForm /></CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader><CardTitle>현재 문구 리소스</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data.contentResources.length ? data.contentResources.map((row: any) => (
            <div key={row.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{row.namespace}.{row.resource_key}</p>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{row.status}</span>
              </div>
              <p className="mt-1 text-slate-500">{row.organization_id ? '조직 override' : '플랫폼 공통'} · {row.locale}</p>
              <p className="mt-2 whitespace-pre-wrap text-slate-700">{row.value_text ?? JSON.stringify(row.value_json)}</p>
            </div>
          )) : <p className="text-sm text-slate-500">등록된 문구가 없습니다.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
