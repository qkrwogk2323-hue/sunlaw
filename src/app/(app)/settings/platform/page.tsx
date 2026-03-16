import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsNav } from '@/components/settings-nav';
import { hasActivePlatformAdminView, requireAuthenticatedUser } from '@/lib/auth';
import { getSettingsAdminData } from '@/lib/queries/settings-admin';
import { PlatformSettingForm } from '@/components/forms/platform-setting-form';
import { notFound } from 'next/navigation';

export default async function PlatformSettingsPage() {
  const auth = await requireAuthenticatedUser();
  if (!(await hasActivePlatformAdminView(auth))) notFound();
  const data = await getSettingsAdminData();
  const platformMap = new Map(data.platformSettings.map((row: any) => [row.key, row.value_json]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Platform Settings</h1>
        <p className="mt-2 text-sm text-slate-600">플랫폼 전체 기본 정책과 상한값을 관리합니다.</p>
      </div>
      <SettingsNav currentPath="/settings/platform" />
      <div className="grid gap-4 xl:grid-cols-2">
        {data.catalog.filter((item: any) => item.scope === 'platform' || item.scope === 'both').map((item: any) => (
          <PlatformSettingForm key={item.key} item={item} currentValue={platformMap.get(item.key)} />
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>최근 변경 로그</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data.changeLogs.filter((row: any) => row.target_type === 'platform_setting').length ? data.changeLogs.filter((row: any) => row.target_type === 'platform_setting').map((row: any) => (
            <div key={row.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-900">{row.target_key}</p>
              <p className="mt-1 text-slate-500">변경자: {row.changed_by_profile?.full_name ?? '-'} · {new Date(row.created_at).toLocaleString('ko-KR')}</p>
              <p className="mt-2 text-slate-500">사유: {row.reason ?? '-'}</p>
            </div>
          )) : <p className="text-sm text-slate-500">변경 이력이 없습니다.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
