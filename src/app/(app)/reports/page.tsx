import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { getDashboardSnapshot } from '@/lib/queries/dashboard';
import { getCollectionsWorkspace } from '@/lib/queries/collections';
import { ExportLinks } from '@/components/export-links';

export default async function ReportsPage() {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const [dashboard, collections] = await Promise.all([
    getDashboardSnapshot(organizationId),
    getCollectionsWorkspace(organizationId)
  ]);

  const stats = [
    ['진행 중 사건', dashboard.activeCases],
    ['결재 대기 문서', dashboard.pendingDocuments],
    ['미처리 요청', dashboard.pendingRequests],
    ['추심 사건', collections.collectionCases.length]
  ];

  return (
    <div className="space-y-6">
      <div className="vs-brand-panel overflow-hidden rounded-[1.8rem] p-6 text-white shadow-[0_24px_54px_rgba(8,47,73,0.26)]">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">성과 리포트</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200/88">현재 운영에서 가장 중요한 수치만 압축해 보여 주어 상태 파악과 공유가 빠르게 이어지도록 구성했습니다.</p>
      </div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">핵심 수치 요약</h2>
          <p className="mt-2 text-sm text-slate-600">현재 버전에서는 핵심 운영 수치를 먼저 보여 주고 이후 상세 리포트로 확장합니다.</p>
        </div>
        <ExportLinks resource="reports" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value]) => (
          <Card key={String(label)} className="vs-interactive bg-gradient-to-br from-slate-50 to-white">
            <CardHeader><CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold text-slate-900">{value}</p></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
