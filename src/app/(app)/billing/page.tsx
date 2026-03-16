import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getActiveViewMode, getEffectiveOrganizationId, hasActivePlatformScenarioView, requireAuthenticatedUser } from '@/lib/auth';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { getBillingHubSnapshot } from '@/lib/queries/billing';
import { isPlatformScenarioMode } from '@/lib/platform-scenarios';
import { getPlatformScenarioBilling } from '@/lib/platform-scenario-workspace';

function badgeTone(status: string) {
  if (status === 'overdue') return 'red';
  if (status === 'upcoming') return 'amber';
  if (status === 'issued' || status === 'partial') return 'blue';
  if (status === 'draft') return 'slate';
  return 'green';
}

export default async function BillingPage() {
  const auth = await requireAuthenticatedUser();
  const activeViewMode = await getActiveViewMode();
  const scenarioMode = isPlatformScenarioMode(activeViewMode) && await hasActivePlatformScenarioView(auth, activeViewMode) ? activeViewMode : null;
  const organizationId = getEffectiveOrganizationId(auth);
  const billing = scenarioMode ? getPlatformScenarioBilling(scenarioMode) : await getBillingHubSnapshot(organizationId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">비용 관련</h1>
          <p className="mt-2 text-sm text-slate-600">어떤 의뢰인에게 얼마를 청구하기로 했고 언제까지 확인해야 하는지, 약정과 입금까지 한 화면에서 봅니다.</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          사건 Billing 탭에서 항목이나 약정을 등록하면 대시보드, 알림, 일정 확인에 자동 반영됩니다.
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">열린 비용 항목</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold text-slate-900">{billing.summary.openEntryCount}</p></CardContent>
        </Card>
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">연체 확인 필요</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold text-red-600">{billing.summary.overdueEntryCount}</p></CardContent>
        </Card>
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">활성 비용 약정</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold text-slate-900">{billing.summary.activeAgreementCount}</p></CardContent>
        </Card>
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">이번 달 예정 금액</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold text-slate-900">{formatCurrency(billing.summary.expectedThisMonth)}</p></CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle>청구 예정과 비용 확인</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {billing.entries.length ? billing.entries.map((entry: any) => (
              <Link key={entry.id} href={`/cases/${entry.case_id}?tab=billing`} className="block rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:border-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{entry.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{entry.cases?.title ?? '사건'} · {entry.targetLabel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={badgeTone(entry.status)}>{entry.status}</Badge>
                    <Badge tone={badgeTone(entry.dueStatus)}>{entry.dueStatus === 'overdue' ? '연체' : entry.dueStatus === 'upcoming' ? '예정' : '미지정'}</Badge>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                  <p>공급가액 {formatCurrency(entry.amount)}</p>
                  <p>세액 {formatCurrency(entry.tax_amount)}</p>
                  <p>기한 {formatDate(entry.due_on)}</p>
                </div>
                {entry.notes ? <p className="mt-3 text-sm leading-7 text-slate-600">{entry.notes}</p> : null}
              </Link>
            )) : <p className="text-sm text-slate-500">열린 비용 항목이 없습니다.</p>}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="vs-mesh-card">
            <CardHeader><CardTitle>비용 약정</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {billing.agreements.length ? billing.agreements.map((agreement: any) => (
                <Link key={agreement.id} href={`/cases/${agreement.case_id}?tab=billing`} className="block rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:border-slate-900">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">{agreement.title}</p>
                    <Badge tone={agreement.is_active ? 'green' : 'slate'}>{agreement.agreement_type}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{agreement.cases?.title ?? '사건'} · {agreement.targetLabel}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {agreement.fixed_amount != null ? `고정금액 ${formatCurrency(agreement.fixed_amount)}` : '고정금액 없음'}
                    {agreement.rate != null ? ` · 비율 ${agreement.rate}%` : ''}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">적용 {formatDate(agreement.effective_from)} ~ {formatDate(agreement.effective_to)}</p>
                </Link>
              )) : <p className="text-sm text-slate-500">등록된 비용 약정이 없습니다.</p>}
            </CardContent>
          </Card>

          <Card className="vs-mesh-card">
            <CardHeader><CardTitle>최근 입금 기록</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {billing.payments.length ? billing.payments.map((payment: any) => (
                <Link key={payment.id} href={`/cases/${payment.case_id}?tab=billing`} className="block rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:border-slate-900">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">{formatCurrency(payment.amount)}</p>
                    <Badge tone="green">{payment.payment_status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{payment.cases?.title ?? '사건'} · {payment.payment_method}</p>
                  <p className="mt-2 text-xs text-slate-400">{formatDateTime(payment.received_at)}</p>
                </Link>
              )) : <p className="text-sm text-slate-500">최근 입금 기록이 없습니다.</p>}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}