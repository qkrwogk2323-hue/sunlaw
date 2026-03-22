import Link from 'next/link';
import type { Route } from 'next';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { getBillingHubSnapshot } from '@/lib/queries/billing';
import { OverdueDraftButton } from '@/components/overdue-draft-button';

type SearchParams = Promise<{ period?: string }>;

const PERIOD_OPTIONS = [
  { key: 'week', label: '주별' },
  { key: 'month', label: '월별' },
  { key: 'quarter', label: '분기별' },
  { key: 'year', label: '연도별' }
] as const;

type PeriodKey = (typeof PERIOD_OPTIONS)[number]['key'];

function normalizePeriod(value?: string | null): PeriodKey {
  return PERIOD_OPTIONS.some((item) => item.key === value) ? (value as PeriodKey) : 'month';
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function getPeriodBounds(period: PeriodKey, now = new Date()) {
  const base = startOfDay(now);
  let start = new Date(base);
  let end = new Date(base);

  if (period === 'week') {
    const day = base.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(base.getDate() + diff);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
  } else if (period === 'month') {
    start = new Date(base.getFullYear(), base.getMonth(), 1);
    end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  } else if (period === 'quarter') {
    const quarterStartMonth = Math.floor(base.getMonth() / 3) * 3;
    start = new Date(base.getFullYear(), quarterStartMonth, 1);
    end = new Date(base.getFullYear(), quarterStartMonth + 3, 0);
  } else {
    start = new Date(base.getFullYear(), 0, 1);
    end = new Date(base.getFullYear(), 11, 31);
  }

  return { start: startOfDay(start), end: endOfDay(end) };
}

function getPreviousPeriodBounds(period: PeriodKey, start: Date) {
  if (period === 'week') {
    const previousStart = new Date(start);
    previousStart.setDate(start.getDate() - 7);
    const previousEnd = new Date(start);
    previousEnd.setDate(start.getDate() - 1);
    return { start: startOfDay(previousStart), end: endOfDay(previousEnd) };
  }

  if (period === 'month') {
    return {
      start: startOfDay(new Date(start.getFullYear(), start.getMonth() - 1, 1)),
      end: endOfDay(new Date(start.getFullYear(), start.getMonth(), 0))
    };
  }

  if (period === 'quarter') {
    return {
      start: startOfDay(new Date(start.getFullYear(), start.getMonth() - 3, 1)),
      end: endOfDay(new Date(start.getFullYear(), start.getMonth(), 0))
    };
  }

  return {
    start: startOfDay(new Date(start.getFullYear() - 1, 0, 1)),
    end: endOfDay(new Date(start.getFullYear() - 1, 11, 31))
  };
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isInRange(value: string | null | undefined, start: Date, end: Date) {
  const date = parseDate(value);
  if (!date) return false;
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

function changeLabel(current: number, previous: number, suffix = '') {
  const delta = current - previous;
  const tone = delta > 0 ? 'text-emerald-700' : delta < 0 ? 'text-red-600' : 'text-slate-500';
  const sign = delta > 0 ? '+' : '';
  return <span className={tone}>{`${sign}${suffix === '%' ? delta.toFixed(1) : delta.toLocaleString('ko-KR')}${suffix}`}</span>;
}

function ratioChange(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? '0.0%' : '신규';
  }
  const ratio = ((current - previous) / previous) * 100;
  const sign = ratio > 0 ? '+' : '';
  return `${sign}${ratio.toFixed(1)}%`;
}

function badgeTone(status: string) {
  if (status === 'overdue' || status === 'locked_hard') return 'red';
  if (status === 'upcoming' || status === 'past_due') return 'amber';
  if (status === 'issued' || status === 'partial' || status === 'trialing') return 'blue';
  if (status === 'draft' || status === 'cancelled') return 'slate';
  return 'green';
}

function agreementLabel(type: string) {
  if (type === 'installment_plan') return '분납 약정';
  if (type === 'retainer') return '착수금';
  if (type === 'flat_fee') return '정액';
  if (type === 'success_fee') return '성공보수';
  if (type === 'expense_reimbursement') return '실비';
  if (type === 'internal_settlement') return '내부정산';
  return type;
}

export default async function BillingPage({
  searchParams
}: {
  searchParams?: SearchParams;
}) {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const resolved = searchParams ? await searchParams : undefined;
  const period = normalizePeriod(resolved?.period);
  const billing = await getBillingHubSnapshot(organizationId);

  const orgName = auth.memberships.find((m) => m.organization_id === organizationId)?.organization?.name ?? '우리 사무소';
  const lawyerName: string | undefined = undefined;
  // eslint-disable-next-line react-hooks/purity -- server component, Date.now() is safe here
  const nowMs = Date.now();

  const bounds = getPeriodBounds(period);
  const previousBounds = getPreviousPeriodBounds(period, bounds.start);

  const currentDueEntries = billing.entries.filter((entry: any) => isInRange(entry.due_on, bounds.start, bounds.end));
  const previousDueEntries = billing.entries.filter((entry: any) => isInRange(entry.due_on, previousBounds.start, previousBounds.end));
  const currentPayments = billing.payments.filter((item: any) => isInRange(item.received_at, bounds.start, bounds.end));
  const previousPayments = billing.payments.filter((item: any) => isInRange(item.received_at, previousBounds.start, previousBounds.end));
  const currentAgreements = billing.agreements.filter((item: any) => isInRange(item.created_at ?? item.effective_from, bounds.start, bounds.end));
  const previousAgreements = billing.agreements.filter((item: any) => isInRange(item.created_at ?? item.effective_from, previousBounds.start, previousBounds.end));

  const currentBilledAmount = currentDueEntries.reduce((sum: number, item: any) => sum + Number(item.totalAmount ?? 0), 0);
  const previousBilledAmount = previousDueEntries.reduce((sum: number, item: any) => sum + Number(item.totalAmount ?? 0), 0);
  const currentReceivedAmount = currentPayments.reduce((sum: number, item: any) => sum + Number(item.amount ?? 0), 0);
  const previousReceivedAmount = previousPayments.reduce((sum: number, item: any) => sum + Number(item.amount ?? 0), 0);

  const openStatuses = new Set(['draft', 'issued', 'partial']);
  const overdueEntries = billing.entries.filter((entry: any) => entry.dueStatus === 'overdue' && openStatuses.has(entry.status));
  const clientVisibleEntries = billing.entries.filter((entry: any) => Boolean(entry.bill_to_case_client_id));
  const clientAttentionEntries = clientVisibleEntries.filter((entry: any) => openStatuses.has(entry.status)).slice(0, 8);
  const installmentAgreements = billing.agreements.filter((agreement: any) => agreement.agreement_type === 'installment_plan' && agreement.is_active);
  const missedInstallmentEntries = overdueEntries.filter((entry: any) => installmentAgreements.some((agreement: any) => (
    agreement.case_id === entry.case_id
    && agreement.bill_to_case_client_id === entry.bill_to_case_client_id
    && agreement.bill_to_case_organization_id === entry.bill_to_case_organization_id
  )));

  const missedInstallmentAgreementKeys = new Set(missedInstallmentEntries.map((entry: any) => `${entry.case_id}:${entry.bill_to_case_client_id ?? ''}:${entry.bill_to_case_organization_id ?? ''}`));
  const installmentComplianceCount = Math.max(installmentAgreements.length - missedInstallmentAgreementKeys.size, 0);

  const comparisonRows = [
    {
      label: '청구 예정/발행 금액',
      current: formatCurrency(currentBilledAmount),
      previous: formatCurrency(previousBilledAmount),
      change: ratioChange(currentBilledAmount, previousBilledAmount)
    },
    {
      label: '입금 확정 금액',
      current: formatCurrency(currentReceivedAmount),
      previous: formatCurrency(previousReceivedAmount),
      change: ratioChange(currentReceivedAmount, previousReceivedAmount)
    },
    {
      label: '새 약정 등록',
      current: `${currentAgreements.length}건`,
      previous: `${previousAgreements.length}건`,
      change: ratioChange(currentAgreements.length, previousAgreements.length)
    },
    {
      label: '분납 미이행',
      current: `${missedInstallmentEntries.length}건`,
      previous: `${previousDueEntries.filter((entry: any) => entry.dueStatus === 'overdue').length}건`,
      change: ratioChange(missedInstallmentEntries.length, previousDueEntries.filter((entry: any) => entry.dueStatus === 'overdue').length)
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">비용 관리</h1>
          <p className="mt-2 text-sm text-slate-600">의뢰인과의 계약, 청구, 분납 약속, 입금 현황을 사건 기준으로 묶어 봅니다. 회사 구독료는 회사 관리의 구독 관리에서 별도로 다룹니다.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Link href={'/admin/audit?tab=general&table=billing_entries' as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>
              청구 기록 보기
            </Link>
            <Link href={'/admin/audit?tab=general&table=billing_payments' as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>
              입금 기록 보기
            </Link>
            <Link href={'/admin/audit?tab=general&table=billing_agreements' as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>
              분납·약정 기록 보기
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/contracts" className={buttonStyles({ variant: 'secondary', className: 'min-h-10 rounded-xl px-4' })}>
            계약 관리
          </Link>
          <Link href={'/settings/subscription' as Route} className={buttonStyles({ variant: 'secondary', className: 'min-h-10 rounded-xl px-4' })}>
            구독 관리
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        여기서 보는 청구와 입금 상태는 사건 화면, 허브, 의뢰인 화면에도 같은 내용으로 이어집니다. 그래서 밀린 분납이나 다가오는 납부 기한을 한 번에 함께 확인할 수 있습니다.
      </div>

      <section className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((option) => {
          const active = option.key === period;
          return (
            <Link
              key={option.key}
              href={`/billing?period=${option.key}`}
              className={`rounded-full px-4 py-2 text-sm font-medium ${active ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
            >
              {option.label}
            </Link>
          );
        })}
        <div className="flex items-center rounded-full bg-slate-100 px-4 py-2 text-xs text-slate-500">
          현재 기준 {formatDate(bounds.start.toISOString())} ~ {formatDate(bounds.end.toISOString())}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">이번 {PERIOD_OPTIONS.find((item) => item.key === period)?.label} 청구 금액</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-semibold text-slate-900">{formatCurrency(currentBilledAmount)}</p>
            <p className="text-sm text-slate-500">직전 대비 {changeLabel(currentBilledAmount, previousBilledAmount)}</p>
          </CardContent>
        </Card>
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">이번 {PERIOD_OPTIONS.find((item) => item.key === period)?.label} 입금액</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-semibold text-slate-900">{formatCurrency(currentReceivedAmount)}</p>
            <p className="text-sm text-slate-500">직전 대비 {changeLabel(currentReceivedAmount, previousReceivedAmount)}</p>
          </CardContent>
        </Card>
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">활성 분납 약정</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-semibold text-slate-900">{installmentAgreements.length}건</p>
            <p className="text-sm text-slate-500">이행 중 {installmentComplianceCount}건 · 미이행 {missedInstallmentAgreementKeys.size}건</p>
          </CardContent>
        </Card>
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">의뢰인 확인 필요</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-semibold text-red-600">{clientAttentionEntries.length}건</p>
            <p className="text-sm text-slate-500">포털/허브에서 납부가 필요한 청구 항목 기준</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle>기간 비교표</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="px-2 py-3 font-medium">지표</th>
                    <th className="px-2 py-3 font-medium">현재</th>
                    <th className="px-2 py-3 font-medium">직전</th>
                    <th className="px-2 py-3 font-medium">변화율</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.label} className="border-b border-slate-100 text-slate-700 last:border-b-0">
                      <td className="px-2 py-3 font-medium text-slate-900">{row.label}</td>
                      <td className="px-2 py-3">{row.current}</td>
                      <td className="px-2 py-3">{row.previous}</td>
                      <td className="px-2 py-3">{row.change}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="vs-mesh-card">
          <CardHeader><CardTitle>운영 메모</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <p>1. 조직 메뉴의 비용 관리는 의뢰인과 약속한 금액, 분납, 입금 추적입니다.</p>
            <p>2. 회사 관리의 구독 관리는 우리 조직이 플랫폼에 내는 구독료입니다.</p>
            <p>3. 분납 미이행이 보이면 사건 비용 탭에서 바로 조정하고, 의뢰인 포털의 청구 카드와 같은 항목인지 함께 확인합니다.</p>
            <p>4. 계약 원본은 계약 관리에 두고, 청구/입금 현황은 이 화면에서 기간 기준으로 비교합니다.</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle>분납 미이행 및 연체 확인</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {missedInstallmentEntries.length ? missedInstallmentEntries.map((entry: any) => (
              <Link key={entry.id} href={`/cases/${entry.case_id}?tab=billing`} className="block rounded-2xl border border-red-200 bg-red-50/70 p-4 transition hover:border-red-300">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{entry.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{entry.cases?.title ?? '사건'} · {entry.targetLabel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="red">분납 미이행</Badge>
                    <Badge tone={badgeTone(entry.status)}>{entry.status}</Badge>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                  <p>금액 {formatCurrency(entry.totalAmount)}</p>
                  <p>기한 {formatDate(entry.due_on)}</p>
                  <p>사건 비용 탭에서 후속 조치</p>
                </div>
              </Link>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                현재 활성 분납 약정 중 기한을 넘긴 항목은 없습니다.
              </div>
            )}

            {overdueEntries.length ? (
              <div className="space-y-3 pt-3">
                <h3 className="text-sm font-semibold text-slate-900">전체 연체 청구</h3>
                {overdueEntries.slice(0, 8).map((entry: any) => {
                  const dueDate = entry.due_on ? new Date(`${entry.due_on}T00:00:00`) : null;
                  const dueDaysAgo = dueDate ? Math.max(0, Math.floor((nowMs - dueDate.getTime()) / 86400000)) : 0;
                  return (
                    <div key={`overdue-${entry.id}`} className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <Link href={`/cases/${entry.case_id}?tab=billing` as Route} className="font-medium text-slate-900 hover:underline">{entry.title}</Link>
                        <Badge tone="red">연체</Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">{entry.cases?.title ?? '사건'} · {entry.targetLabel}</p>
                      <p className="mt-2 text-sm text-slate-600">{formatCurrency(entry.totalAmount)} · 기한 {formatDate(entry.due_on)}</p>
                      {organizationId && (
                        <div className="mt-3">
                          <OverdueDraftButton
                            organizationId={organizationId}
                            orgName={orgName}
                            lawyerName={lawyerName}
                            clientName={entry.targetLabel ?? '의뢰인'}
                            caseTitle={entry.cases?.title ?? entry.title}
                            overdueAmount={Number(entry.totalAmount ?? 0)}
                            dueDaysAgo={dueDaysAgo}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="vs-mesh-card">
            <CardHeader><CardTitle>활성 계약/분납 약정</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {billing.agreements.filter((item: any) => item.is_active).length ? billing.agreements.filter((item: any) => item.is_active).slice(0, 10).map((agreement: any) => (
                <Link key={agreement.id} href={`/cases/${agreement.case_id}?tab=billing`} className="block rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:border-slate-900">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">{agreement.title}</p>
                    <Badge tone={agreement.agreement_type === 'installment_plan' ? 'blue' : 'green'}>{agreementLabel(agreement.agreement_type)}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{agreement.cases?.title ?? '사건'} · {agreement.targetLabel}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {agreement.fixed_amount != null ? `약정금액 ${formatCurrency(agreement.fixed_amount)}` : '약정금액 미지정'}
                    {agreement.rate != null ? ` · 비율 ${agreement.rate}%` : ''}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">적용 {formatDate(agreement.effective_from)} ~ {formatDate(agreement.effective_to)}</p>
                </Link>
              )) : <p className="text-sm text-slate-500">활성 계약이 없습니다.</p>}
            </CardContent>
          </Card>

          <Card className="vs-mesh-card">
            <CardHeader><CardTitle>최근 입금 기록</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {billing.payments.length ? billing.payments.slice(0, 10).map((payment: any) => (
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

      <Card className="vs-mesh-card">
        <CardHeader><CardTitle>의뢰인에게 공유되는 청구 항목</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {clientAttentionEntries.length ? clientAttentionEntries.map((entry: any) => (
            <div key={`client-${entry.id}`} className="rounded-2xl border border-slate-200 bg-white/90 p-4">
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
              <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-4">
                <p>금액 {formatCurrency(entry.totalAmount)}</p>
                <p>기한 {formatDate(entry.due_on)}</p>
                <p>의뢰인 포털 청구 카드 노출 대상</p>
                <Link href={`/cases/${entry.case_id}?tab=billing`} className="font-medium text-sky-700 hover:text-sky-900">사건에서 보기</Link>
              </div>
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              현재 의뢰인에게 열려 있는 청구 항목이 없습니다.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
