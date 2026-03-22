import Link from 'next/link';
import type { Route } from 'next';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { formatCurrency, formatDate } from '@/lib/format';
import { getBillingHubSnapshot } from '@/lib/queries/billing';
import { OverdueDraftButton } from '@/components/overdue-draft-button';
import { InstallmentFollowUpActions } from '@/components/forms/installment-follow-up-actions';

function badgeTone(status: string) {
  if (status === 'overdue' || status === 'locked_hard') return 'red';
  if (status === 'upcoming' || status === 'past_due') return 'amber';
  if (status === 'issued' || status === 'partial' || status === 'trialing') return 'blue';
  if (status === 'draft' || status === 'cancelled') return 'slate';
  return 'green';
}

function billingStatusLabel(status: string) {
  if (status === 'draft') return '초안';
  if (status === 'issued') return '발행';
  if (status === 'partial') return '일부 입금';
  if (status === 'paid') return '입금 완료';
  if (status === 'overdue') return '연체';
  if (status === 'cancelled') return '취소';
  return status;
}

function dueStatusLabel(status: string) {
  if (status === 'overdue') return '기한 지남';
  if (status === 'upcoming') return '기한 예정';
  return '기한 없음';
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

export default async function BillingPage() {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const billing = await getBillingHubSnapshot(organizationId);

  const orgName = auth.memberships.find((m) => m.organization_id === organizationId)?.organization?.name ?? '우리 사무소';
  const lawyerName: string | undefined = undefined;
  // eslint-disable-next-line react-hooks/purity -- server component, Date.now() is safe here
  const nowMs = Date.now();
  const openStatuses = new Set(['draft', 'issued', 'partial']);
  const overdueEntries = billing.entries.filter((entry: any) => entry.dueStatus === 'overdue' && openStatuses.has(entry.status));
  const clientVisibleEntries = billing.entries.filter((entry: any) => Boolean(entry.bill_to_case_client_id));
  const clientAttentionEntries = clientVisibleEntries.filter((entry: any) => openStatuses.has(entry.status)).slice(0, 8);
  const remunerationEntries = billing.entries.filter((entry: any) => ['retainer_fee', 'flat_fee', 'success_fee', 'service_fee', 'adjustment', 'discount'].includes(entry.entry_kind));
  const publicChargeEntries = billing.entries.filter((entry: any) => ['expense', 'court_fee'].includes(entry.entry_kind));
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
  const topCards = [
    {
      label: '보수',
      value: remunerationEntries.length,
      href: '/billing#remuneration' as Route
    },
    {
      label: '공과금',
      value: publicChargeEntries.length,
      href: '/billing#public-charges' as Route
    },
    {
      label: '분할납부약정금액',
      value: installmentAgreements.length,
      href: '/billing#installment-agreements' as Route
    },
    {
      label: '미납 금액',
      value: clientAttentionEntries.length,
      href: '/billing#outstanding-amounts' as Route
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">비용 관리</h1>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Link href={'/billing/history' as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>
            비용 기록 보기
          </Link>
          <Link href="/contracts" className={buttonStyles({ variant: 'secondary', className: 'min-h-10 rounded-xl px-4' })}>
            계약 관리
          </Link>
        </div>
      </div>

      <section className="grid gap-3 xl:grid-cols-4">
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

      <section className="grid gap-6 xl:grid-cols-2">
        <Card id="remuneration">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>보수</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {remunerationEntries.length ? remunerationEntries.slice(0, 10).map((entry: any) => (
              <div key={`remuneration-${entry.id}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{entry.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{entry.cases?.title ?? '사건'} · {entry.targetLabel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={badgeTone(entry.status)}>{billingStatusLabel(entry.status)}</Badge>
                    <Badge tone={badgeTone(entry.dueStatus)}>{dueStatusLabel(entry.dueStatus)}</Badge>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                  <p>공급가액 {formatCurrency(entry.amount)} · 부가세 {formatCurrency(entry.tax_amount ?? 0)}</p>
                  <p>합계 {formatCurrency(entry.totalAmount)} · 기한 {formatDate(entry.due_on)}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/cases/${entry.case_id}?tab=billing`} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>사건에서 보기</Link>
                  {entry.hub?.id ? (
                    <Link href={`/inbox/${entry.hub.id}`} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>허브에서 보기</Link>
                  ) : null}
                  {entry.bill_to_case_client_id ? (
                    <Link href={'/portal/billing' as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>의뢰인 화면 보기</Link>
                  ) : null}
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                현재 등록된 보수 항목이 없습니다.
              </div>
            )}
          </CardContent>
        </Card>

        <Card id="public-charges">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>공과금</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {publicChargeEntries.length ? publicChargeEntries.slice(0, 10).map((entry: any) => (
              <div key={`public-charge-${entry.id}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{entry.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{entry.cases?.title ?? '사건'} · {entry.targetLabel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={badgeTone(entry.status)}>{billingStatusLabel(entry.status)}</Badge>
                    <Badge tone={badgeTone(entry.dueStatus)}>{dueStatusLabel(entry.dueStatus)}</Badge>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                  <p>공급가액 {formatCurrency(entry.amount)} · 부가세 {formatCurrency(entry.tax_amount ?? 0)}</p>
                  <p>합계 {formatCurrency(entry.totalAmount)} · 기한 {formatDate(entry.due_on)}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/cases/${entry.case_id}?tab=billing`} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>사건에서 보기</Link>
                  {entry.hub?.id ? (
                    <Link href={`/inbox/${entry.hub.id}`} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>허브에서 보기</Link>
                  ) : null}
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                현재 등록된 공과금 항목이 없습니다.
              </div>
            )}
          </CardContent>
        </Card>

        <Card id="installment-agreements">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>분할납부약정금액</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {installmentAgreements.length ? installmentAgreements.slice(0, 10).map((agreement: any) => (
              <div key={`agreement-${agreement.id}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{agreement.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{agreement.cases?.title ?? '사건'} · {agreement.targetLabel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={agreement.shortageAmount > 0 ? 'amber' : 'blue'}>
                      {agreement.shortageAmount > 0 ? '후속 필요' : '진행중'}
                    </Badge>
                    <Badge tone="blue">{agreementLabel(agreement.agreement_type)}</Badge>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                  <p>약정금액 {formatCurrency(agreement.fixed_amount ?? 0)} · 현재 입금 {formatCurrency(agreement.paidAmount ?? 0)}</p>
                  <p>부족 {formatCurrency(agreement.shortageAmount ?? 0)} · 적용 {formatDate(agreement.effective_from)}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/cases/${agreement.case_id}?tab=billing`} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>사건에서 보기</Link>
                  {agreement.hub?.id ? (
                    <Link href={`/inbox/${agreement.hub.id}`} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>허브에서 보기</Link>
                  ) : null}
                  {agreement.bill_to_case_client_id ? (
                    <Link href={'/portal/billing' as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>의뢰인 화면 보기</Link>
                  ) : null}
                </div>
                {(agreement.shortageAmount ?? 0) > 0 ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <InstallmentFollowUpActions agreementId={agreement.id} caseId={agreement.case_id} />
                  </div>
                ) : null}
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                현재 등록된 분할납부 약정이 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card id="outstanding-amounts">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>미납 금액</CardTitle>
            <Link href={'/portal/billing' as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>포털 청구 보기</Link>
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
                    <Badge tone={badgeTone(entry.status)}>{billingStatusLabel(entry.status)}</Badge>
                    <Badge tone={badgeTone(entry.dueStatus)}>{dueStatusLabel(entry.dueStatus)}</Badge>
                  </div>
                </div>
              <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                <p>금액 {formatCurrency(entry.totalAmount)}</p>
                <p>기한 {formatDate(entry.due_on)}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/cases/${entry.case_id}?tab=billing`} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>사건에서 보기</Link>
                <Link href={'/portal/billing' as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>포털 청구 보기</Link>
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
