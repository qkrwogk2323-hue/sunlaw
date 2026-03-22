import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { formatCurrency, formatDate } from '@/lib/format';
import { getBillingHubSnapshot } from '@/lib/queries/billing';

export default async function ContractsPage({
  searchParams
}: {
  searchParams?: Promise<{ caseId?: string }>;
}) {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const resolved = searchParams ? await searchParams : undefined;
  const caseId = `${resolved?.caseId ?? ''}`.trim() || null;
  const billing = await getBillingHubSnapshot(organizationId);
  const agreements = caseId ? billing.agreements.filter((item: any) => item.case_id === caseId) : billing.agreements;
  const activeAgreements = agreements.filter((item: any) => item.is_active);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">계약 관리</h1>
          <p className="mt-2 text-sm text-slate-600">
            사건별 비용 약정, 적용 기간, 청구 대상을 한 곳에서 확인합니다. 허브와 사건 화면에서 연결된 계약은 이 페이지에서 다시 검토할 수 있습니다.
          </p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          계약 내용은 이 화면에서 따로 모아 보고, 청구나 입금 진행 상황은 비용 관리에서 이어서 확인할 수 있습니다.
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">활성 계약</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold text-slate-900">{activeAgreements.length}</p></CardContent>
        </Card>
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">전체 계약</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold text-slate-900">{agreements.length}</p></CardContent>
        </Card>
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">고정금액 합계</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">
              {formatCurrency(activeAgreements.reduce((sum: number, item: any) => sum + Number(item.fixed_amount ?? 0), 0))}
            </p>
          </CardContent>
        </Card>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link href="/billing" className={buttonStyles({ variant: 'secondary', className: 'min-h-10 rounded-xl px-4' })}>
          비용 관리 보기
        </Link>
        <Link href="/notifications" className={buttonStyles({ variant: 'secondary', className: 'min-h-10 rounded-xl px-4' })}>
          관련 알림 보기
        </Link>
      </div>

      <Card className="vs-mesh-card">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>계약 목록</CardTitle>
            {caseId ? <Badge tone="blue">선택 사건만 표시</Badge> : <Badge tone="slate">전체 사건</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {agreements.length ? agreements.map((agreement: any) => (
            <Link
              key={agreement.id}
              href={`/cases/${agreement.case_id}?tab=billing`}
              className="block rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:border-slate-900"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{agreement.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{agreement.cases?.title ?? '사건'} · {agreement.targetLabel}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={agreement.is_active ? 'green' : 'slate'}>{agreement.is_active ? '활성' : '비활성'}</Badge>
                  <Badge tone="blue">{agreement.agreement_type}</Badge>
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                <p>{agreement.fixed_amount != null ? `고정금액 ${formatCurrency(agreement.fixed_amount)}` : '고정금액 없음'}</p>
                <p>{agreement.rate != null ? `비율 ${agreement.rate}%` : '비율 미지정'}</p>
                <p>적용 {formatDate(agreement.effective_from)} ~ {formatDate(agreement.effective_to)}</p>
              </div>
            </Link>
          )) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              표시할 계약이 없습니다. 사건 화면의 비용 탭에서 비용 약정을 먼저 등록해 주세요.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
