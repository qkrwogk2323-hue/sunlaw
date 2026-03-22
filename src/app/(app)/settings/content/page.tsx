import Link from 'next/link';
import type { Route } from 'next';
import { buttonStyles } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsNav } from '@/components/settings-nav';
import { findMembership, getEffectiveOrganizationId, getPlatformOrganizationContextId, hasActivePlatformAdminView, requireAuthenticatedUser } from '@/lib/auth';
import { isWorkspaceAdmin } from '@/lib/permissions';
import { getSettingsAdminData } from '@/lib/queries/settings-admin';
import { ContentResourceForm } from '@/components/forms/content-resource-form';
import { AccessDeniedBlock } from '@/components/ui/access-denied-block';

export default async function ContentResourcesPage() {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const membership = organizationId ? findMembership(auth, organizationId) : null;
  const canManageOrg = Boolean(membership && isWorkspaceAdmin(membership));
  const platformContextId = getPlatformOrganizationContextId(auth);
  const canManagePlatform = await hasActivePlatformAdminView(auth, platformContextId);
  if (!canManageOrg && !canManagePlatform) {
    return (
      <AccessDeniedBlock
        blocked="문구/리소스 관리 화면 접근이 차단되었습니다."
        cause="현재 조직 또는 현재 계정 권한으로는 문구/리소스를 수정할 수 없습니다."
        resolution="조직 관리자 또는 플랫폼 조직 관리자 권한으로 전환한 뒤 다시 시도해 주세요."
      />
    );
  }
  const data = await getSettingsAdminData(organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">문구 관리</h1>
        <p className="mt-2 text-sm text-slate-600">랜딩 카피, 포털 문구, 이메일 제목, 조직별 용어를 관리합니다.</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link href={'/admin/audit?tab=general&table=content_resources' as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>
            문구 변경 기록 보기
          </Link>
          <Link href={'/admin/audit?tab=general&table=setting_change_logs' as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>
            설정 변경 사유 기록 보기
          </Link>
        </div>
      </div>
      <SettingsNav currentPath="/settings/content" canViewPlatformControls={canManagePlatform} />
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
              <p className="mt-1 text-slate-500">{row.organization_id ? '조직별 문구' : '플랫폼 공통 문구'} · {row.locale}</p>
              <p className="mt-2 whitespace-pre-wrap text-slate-700">{row.value_text ?? JSON.stringify(row.value_json)}</p>
            </div>
          )) : <p className="text-sm text-slate-500">등록된 문구가 없습니다.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
