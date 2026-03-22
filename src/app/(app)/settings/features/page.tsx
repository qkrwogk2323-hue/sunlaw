import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsNav } from '@/components/settings-nav';
import { getPlatformOrganizationContextId, hasActivePlatformAdminView, requireAuthenticatedUser } from '@/lib/auth';
import { getSettingsAdminData } from '@/lib/queries/settings-admin';
import { FeatureFlagForm } from '@/components/forms/feature-flag-form';
import { AccessDeniedBlock } from '@/components/ui/access-denied-block';

export default async function FeatureFlagsPage() {
  const auth = await requireAuthenticatedUser();
  const canViewPlatformControls = await hasActivePlatformAdminView(auth, getPlatformOrganizationContextId(auth));
  if (!canViewPlatformControls) {
    return (
      <AccessDeniedBlock
        blocked="플랫폼 관리자 전용 화면 접근이 차단되었습니다."
        cause="현재 조직 또는 현재 계정 권한으로는 기능 설정을 관리할 수 없습니다."
        resolution="플랫폼 조직 관리자 권한으로 전환하거나, 권한 승인을 요청해 주세요."
      />
    );
  }
  const data = await getSettingsAdminData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">기능 설정</h1>
        <p className="mt-2 text-sm text-slate-600">플랫폼 기능의 사용 여부와 단계적 적용 비율을 관리합니다.</p>
        <p className="mt-2 text-sm text-sky-700">
          {/* BUG-AUDIT: 감사로그 직접 이동 차단 - 일반 사용자가 플랫폼 관리자 감사로그에 접근하는 버그 */}
        </p>
      </div>
      <SettingsNav currentPath="/settings/features" canViewPlatformControls={canViewPlatformControls} />
      <Card>
        <CardHeader><CardTitle>플랫폼 기능 설정 추가/수정</CardTitle></CardHeader>
        <CardContent><FeatureFlagForm /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>현재 기능 설정</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data.featureFlags.length ? data.featureFlags.map((row: any) => (
            <div key={row.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{row.flag_key}</p>
                <span className={`rounded-full px-2 py-1 text-xs ${row.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{row.enabled ? '사용 중' : '중지됨'}</span>
              </div>
              <p className="mt-1 text-slate-500">적용 비율: {row.rollout_percentage}%</p>
            </div>
          )) : <p className="text-sm text-slate-500">등록된 기능 설정이 없습니다.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
