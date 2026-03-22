import Link from 'next/link';
import type { Route } from 'next';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { getBillingHubSnapshot } from '@/lib/queries/billing';
import { OverdueDraftButton } from '@/components/overdue-draft-button';
import { InstallmentFollowUpActions } from '@/components/forms/installment-follow-up-actions';

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

function billingIntentLabel(intent?: string | null) {
  if (intent === 'receivable') return '받아야 할 금액';
  if (intent === 'received') return '이미 받은 금액';
  if (intent === 'installment_pending') return '비용입금 미확인 분납계약';
  return '별도 분류 없음';
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
  const openStatuses = new Set(['draft', 'issued', 'partial']);
  const overdueEntries = billing.entries.filter((entry: any) => entry.dueStatus === 'overdue' && openStatuses.has(entry.status));
  const clientVisibleEntries = billing.entries.filter((entry: any) => Boolean(entry.bill_to_case_client_id));
  const clientAttentionEntries = clientVisibleEntries.filter((entry: any) => openStatuses.has(entry.status)).slice(0, 8);
  const installmentAgreements = billing.agreements.filter((agreement: any) => agreement.agreement_type === 'installment_plan' && agreement.is_active);
  const installmentPendingAgreements = billing.agreements.filter((agreement: any) => (
    agreement.is_active && agreement.terms_json?.billing_intent === 'installment_pending'
  ));
  const missedInstallmentEntries = overdueEntries.filter((entry: any) => installmentAgreements.some((agreement: any) => (
    agreement.case_id === entry.case_id
    && agreement.bill_to_case_client_id === entry.bill_to_case_client_id
    && agreement.bill_to_case_organization_id === entry.bill_to_case_organization_id
  )));

  const missedInstallmentAgreementKeys = new Set(missedInstallmentEntries.map((entry: any) => `${entry.case_id}:${entry.bill_to_case_client_id ?? ''}:${entry.bill_to_case_organization_id ?? ''}`));
  const installmentComplianceCount = Math.max(installmentAgreements.length - missedInstallmentAgreementKeys.size, 0);

  const activeAgreements = billing.agreements.filter((item: any) => item.is_active);
  const caseLinkedEntries = billing.entries.filter((entry: any) => Boolean(entry.case_id));
  const contractLinkedCosts = activeAgreements.filter((agreement: any) => Boolean(agreement.case_id));
  const paymentRecords = billing.payments;
  const topCards = [
    {
      label: '사건 연결 청구',
      value: caseLinkedEntries.length,
      href: '/cases' as Route
    },
    {
      label: '계약 연결 비용',
      value: contractLinkedCosts.length,
      href: '/contracts' as Route
    },
    {
      label: '의뢰인 확인 필요',
      value: clientAttentionEntries.length,
      href: '/portal/billing' as Route
    },
    {
      label: '분납 후속 처리',
      value: installmentPendingAgreements.length + missedInstallmentEntries.length,
      href: '/billing#installment-follow-up' as Route
    },
    {
      label: '입금 기록',
      value: paymentRecords.length,
      href: '/billing#recent-payments' as Route
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">비용 관리</h1>
          <p className="mt-2 text-sm text-slate-600">사건, 계약, 의뢰인 확인, 분납 흐름만 묶어서 봅니다.</p>
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
          <Link href={'/notifications' as Route} className={buttonStyles({ variant: 'secondary', className: 'min-h-10 rounded-xl px-4' })}>
            비용 알림 보기
          </Link>
        </div>
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

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {topCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-4 transition hover:border-slate-300"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{card.label}</p>
            <p className="mt-6 text-center text-3xl font-semibold text-slate-950 tabular-nums">{card.value}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card id="installment-follow-up">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>분납 후속 처리</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {installmentPendingAgreements.length ? installmentPendingAgreements.map((agreement: any) => (
              <div key={`pending-${agreement.id}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{agreement.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{agreement.cases?.title ?? '사건'} · {agreement.targetLabel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="amber">미입금 확인 필요</Badge>
                    <Badge tone="blue">{agreementLabel(agreement.agreement_type)}</Badge>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                  <p>{agreement.fixed_amount != null ? `약정금액 ${formatCurrency(agreement.fixed_amount)}` : '약정금액 미지정'}</p>
                  <p>{`현재 입금 ${formatCurrency(agreement.paidAmount ?? 0)} · 부족 ${formatCurrency(agreement.shortageAmount ?? 0)}`}</p>
                  <p>기준 {agreement.terms_json?.installment_start_mode === 'first_due' ? '첫 납부일 기준' : '오늘부터 확인'}</p>
                  <Link href={`/cases/${agreement.case_id}?tab=billing`} className="font-medium text-slate-900 underline underline-offset-4">사건 비용 탭 열기</Link>
                </div>
                {(agreement.shortageAmount ?? 0) > 0 ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <InstallmentFollowUpActions agreementId={agreement.id} caseId={agreement.case_id} />
                  </div>
                ) : null}
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                현재 따로 확인해야 할 분납 계약은 없습니다.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>즉시 처리할 비용</CardTitle>
              <Link href={'/admin/audit?tab=general&table=billing_entries' as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>
                청구 기록 보기
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {missedInstallmentEntries.length ? missedInstallmentEntries.map((entry: any) => (
              <Link key={entry.id} href={`/cases/${entry.case_id}?tab=billing`} className="block rounded-2xl border border-red-200 bg-red-50/70 p-4">
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
                <h3 className="text-sm font-semibold text-slate-900">연체 청구</h3>
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>계약 연결 비용</CardTitle>
                <Link href={'/admin/audit?tab=general&table=billing_agreements' as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>
                  계약 변경 기록 보기
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeAgreements.length ? activeAgreements.slice(0, 10).map((agreement: any) => (
                <Link key={agreement.id} href={`/cases/${agreement.case_id}?tab=billing`} className="block rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">{agreement.title}</p>
                    <Badge tone={agreement.agreement_type === 'installment_plan' ? 'blue' : 'green'}>{agreementLabel(agreement.agreement_type)}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{agreement.cases?.title ?? '사건'} · {agreement.targetLabel}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {agreement.fixed_amount != null ? `약정금액 ${formatCurrency(agreement.fixed_amount)}` : '약정금액 미지정'}
                    {agreement.rate != null ? ` · 비율 ${agreement.rate}%` : ''}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">현재 입금 · {formatCurrency(agreement.paidAmount ?? 0)} / 부족 · {formatCurrency(agreement.shortageAmount ?? 0)}</p>
                  <p className="mt-2 text-xs text-slate-500">금액 분류 · {billingIntentLabel(agreement.terms_json?.billing_intent)}</p>
                  {agreement.terms_json?.installment_follow_up?.mode ? (
                    <p className="mt-2 text-xs text-slate-500">
                      후속 결정 · {agreement.terms_json.installment_follow_up.mode === 'merged_charge' ? '부족분 합산 청구' : '회차 늘리기'}
                    </p>
                  ) : null}
                  {agreement.terms_json?.installment_follow_up?.mode === 'extend_rounds' ? (
                    <p className="mt-2 text-xs text-slate-500">
                      추가 회차 {agreement.terms_json.installment_follow_up.additional_rounds ?? '-'}회 · 다음 기준일 {formatDate(agreement.terms_json.installment_follow_up.next_due_on)}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-400">적용 {formatDate(agreement.effective_from)} ~ {formatDate(agreement.effective_to)}</p>
                </Link>
              )) : <p className="text-sm text-slate-500">활성 계약이 없습니다.</p>}
            </CardContent>
          </Card>

          <Card id="recent-payments">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>최근 입금 기록</CardTitle>
            </div>
          </CardHeader>
            <CardContent className="space-y-3">
              {paymentRecords.length ? paymentRecords.slice(0, 10).map((payment: any) => (
                <Link key={payment.id} href={`/cases/${payment.case_id}?tab=billing`} className="block rounded-2xl border border-slate-200 bg-white p-4">
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>의뢰인 확인 필요</CardTitle>
            <Link href={'/portal/billing' as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>
              포털 청구 보기
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {clientAttentionEntries.length ? clientAttentionEntries.map((entry: any) => (
            <div key={`client-${entry.id}`} className="rounded-2xl border border-slate-200 bg-white p-4">
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
                <p>포털에서 확인 중</p>
                <Link href={`/cases/${entry.case_id}?tab=billing`} className="font-medium text-slate-900 underline underline-offset-4">사건에서 보기</Link>
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
