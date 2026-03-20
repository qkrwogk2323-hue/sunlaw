import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsNav } from '@/components/settings-nav';
import { getEffectiveOrganizationId, isPlatformOperator, requireAuthenticatedUser } from '@/lib/auth';
import { getSettingsAdminData } from '@/lib/queries/settings-admin';
import { AccessDeniedBlock } from '@/components/ui/access-denied-block';

export default async function SettingsIndexPage() {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  if (!organizationId && !isPlatformOperator(auth)) {
    return (
      <AccessDeniedBlock
        blocked="설정 화면 접근이 차단되었습니다."
        cause="현재 계정에 접근 가능한 조직 컨텍스트가 없습니다."
        resolution="조직 가입을 완료하거나 조직 전환 후 다시 시도해 주세요."
      />
    );
  }
  const data = await getSettingsAdminData(organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-2 text-sm text-slate-600">Dynamic Configuration, 문구, 기능 플래그, 권한 템플릿을 한 곳에서 관리합니다.</p>
      </div>
      <SettingsNav currentPath="/settings" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm font-medium text-slate-500">카탈로그 키 수</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold text-slate-900">{data.catalog.length}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm font-medium text-slate-500">기본 설정 수</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold text-slate-900">{data.platformSettings.length}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm font-medium text-slate-500">조직 오버라이드 수</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold text-slate-900">{data.organizationSettings.length}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm font-medium text-slate-500">최근 변경 로그</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold text-slate-900">{data.changeLogs.length}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>운영 원칙</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p>1. 설정과 문구와 도메인 데이터는 분리합니다.</p>
          <p>2. 플랫폼 기본값 위에 조직별 오버라이드를 올립니다.</p>
          <p>3. 보안과 비용에 직접 영향을 주는 값은 플랫폼 관리자만 수정합니다.</p>
          <p>4. 모든 변경은 감사로그에 남고 롤백 가능합니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}
