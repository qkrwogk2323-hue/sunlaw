import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsNav } from '@/components/settings-nav';
import { getPlatformOrganizationContextId, hasActivePlatformAdminView, requireAuthenticatedUser } from '@/lib/auth';
import { getSettingsAdminData } from '@/lib/queries/settings-admin';
import { FeatureFlagForm } from '@/components/forms/feature-flag-form';

export default async function FeatureFlagsPage() {
  const auth = await requireAuthenticatedUser();
  if (!(await hasActivePlatformAdminView(auth, getPlatformOrganizationContextId(auth)))) notFound();
  const data = await getSettingsAdminData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Feature Flags</h1>
        <p className="mt-2 text-sm text-slate-600">기능 on/off와 점진적 rollout을 관리합니다.</p>
      </div>
      <SettingsNav currentPath="/settings/features" />
      <Card>
        <CardHeader><CardTitle>플랫폼 플래그 추가/수정</CardTitle></CardHeader>
        <CardContent><FeatureFlagForm /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>현재 플래그</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data.featureFlags.length ? data.featureFlags.map((row: any) => (
            <div key={row.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{row.flag_key}</p>
                <span className={`rounded-full px-2 py-1 text-xs ${row.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{row.enabled ? 'enabled' : 'disabled'}</span>
              </div>
              <p className="mt-1 text-slate-500">rollout: {row.rollout_percentage}%</p>
            </div>
          )) : <p className="text-sm text-slate-500">등록된 기능 플래그가 없습니다.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
