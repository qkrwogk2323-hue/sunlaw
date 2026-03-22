import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import type { Route } from 'next';
import { buttonStyles } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { getBillingHubSnapshot } from '@/lib/queries/billing';

/**
 * @rule-meta-start
 * surfaceScope: organization
 * requiresAuth: true
 * requiresTraceability: false
 * traceEntity: billing_history
 * @rule-meta-end
 */
export const dynamic = 'force-dynamic';

type BillingHistoryTab = 'remuneration' | 'public' | 'installment' | 'payments';

function parseTab(value?: string): BillingHistoryTab {
  if (value === 'public') return 'public';
  if (value === 'installment') return 'installment';
  if (value === 'payments') return 'payments';
  return 'remuneration';
}

function statusTone(status: string) {
  if (status === 'paid' || status === 'confirmed' || status === 'approved') return 'green' as const;
  if (status === 'overdue' || status === 'rejected') return 'red' as const;
  if (status === 'pending_review' || status === 'issued' || status === 'partial') return 'amber' as const;
  return 'slate' as const;
}

export default async function BillingHistoryPage({
  searchParams
}: {
  searchParams?: Promise<{ tab?: string; q?: string }>;
}) {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const resolved = searchParams ? await searchParams : undefined;
  const tab = parseTab(resolved?.tab);
  const query = `${resolved?.q ?? ''}`.trim().toLowerCase();
  const billing = await getBillingHubSnapshot(organizationId);

  const remunerationEntries = billing.entries.filter((item: any) => ['retainer_fee', 'flat_fee', 'success_fee', 'service_fee', 'adjustment', 'discount'].includes(item.entry_kind));
  const publicChargeEntries = billing.entries.filter((item: any) => ['expense', 'court_fee'].includes(item.entry_kind));
  const installmentAgreements = billing.agreements.filter((item: any) => item.agreement_type === 'installment_plan');
  const filteredRemunerationEntries = remunerationEntries.filter((item: any) => {
    if (!query) return true;
    const haystack = `${item.title ?? ''} ${item.targetLabel ?? ''} ${item.cases?.title ?? ''}`.toLowerCase();
    return haystack.includes(query);
  });
  const filteredPublicChargeEntries = publicChargeEntries.filter((item: any) => {
    if (!query) return true;
    const haystack = `${item.title ?? ''} ${item.targetLabel ?? ''} ${item.cases?.title ?? ''}`.toLowerCase();
    return haystack.includes(query);
  });
  const filteredInstallmentAgreements = installmentAgreements.filter((item: any) => {
    if (!query) return true;
    const haystack = `${item.title ?? ''} ${item.targetLabel ?? ''} ${item.cases?.title ?? ''}`.toLowerCase();
    return haystack.includes(query);
  });
  const filteredPayments = billing.payments.filter((item: any) => {
    if (!query) return true;
    const haystack = `${item.reference_text ?? ''} ${item.payment_method ?? ''} ${item.cases?.title ?? ''}`.toLowerCase();
    return haystack.includes(query);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">비용 기록</h1>
        </div>
        <Link href={'/billing' as Route} className={buttonStyles({ variant: 'secondary', className: 'min-h-10 rounded-xl px-4' })}>
          비용 관리로 돌아가기
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={'/billing/history?tab=remuneration' as Route} className={buttonStyles({ variant: tab === 'remuneration' ? 'primary' : 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>보수 기록</Link>
        <Link href={'/billing/history?tab=public' as Route} className={buttonStyles({ variant: tab === 'public' ? 'primary' : 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>공과금 기록</Link>
        <Link href={'/billing/history?tab=installment' as Route} className={buttonStyles({ variant: tab === 'installment' ? 'primary' : 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>분할납부약정금액 기록</Link>
        <Link href={'/billing/history?tab=payments' as Route} className={buttonStyles({ variant: tab === 'payments' ? 'primary' : 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>입금 기록</Link>
      </div>

      <form action="/billing/history" className="rounded-2xl border border-slate-200 bg-white p-3">
        <input type="hidden" name="tab" value={tab} />
        <input
          name="q"
          defaultValue={query}
          placeholder="제목, 사건명, 대상, 입금 메모 검색"
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
          aria-label="비용 기록 검색"
        />
      </form>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>
                {tab === 'remuneration' ? '보수 기록' : tab === 'public' ? '공과금 기록' : tab === 'installment' ? '분할납부약정금액 기록' : '입금 기록'}
              </CardTitle>
              <Badge tone="slate">
                {tab === 'remuneration'
                  ? filteredRemunerationEntries.length
                  : tab === 'public'
                    ? filteredPublicChargeEntries.length
                    : tab === 'installment'
                      ? filteredInstallmentAgreements.length
                      : filteredPayments.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {tab === 'remuneration' ? (
              filteredRemunerationEntries.length ? filteredRemunerationEntries.map((item: any) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">{item.cases?.title ?? '사건'} · {item.targetLabel}</p>
                <p className="mt-2 text-sm text-slate-600">공급가액 {formatCurrency(item.amount)} · 부가세 {formatCurrency(item.tax_amount ?? 0)} · 합계 {formatCurrency(item.totalAmount)}</p>
                <p className="mt-2 text-xs text-slate-400">{formatDate(item.due_on)} · {formatDateTime(item.created_at)}</p>
                </div>
            )) : <p className="text-sm text-slate-500">표시할 보수 기록이 없습니다.</p>
            ) : null}

            {tab === 'public' ? (
              filteredPublicChargeEntries.length ? filteredPublicChargeEntries.map((item: any) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">{item.cases?.title ?? '사건'} · {item.targetLabel}</p>
                <p className="mt-2 text-sm text-slate-600">공급가액 {formatCurrency(item.amount)} · 부가세 {formatCurrency(item.tax_amount ?? 0)} · 합계 {formatCurrency(item.totalAmount)}</p>
                <p className="mt-2 text-xs text-slate-400">{formatDate(item.due_on)} · {formatDateTime(item.created_at)}</p>
                </div>
            )) : <p className="text-sm text-slate-500">표시할 공과금 기록이 없습니다.</p>
            ) : null}

            {tab === 'installment' ? (
              filteredInstallmentAgreements.length ? filteredInstallmentAgreements.map((item: any) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <Badge tone={item.is_active ? 'blue' : 'slate'}>{item.is_active ? '활성' : '비활성'}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">{item.cases?.title ?? '사건'} · {item.targetLabel}</p>
                <p className="mt-2 text-sm text-slate-600">공급가액 {formatCurrency(item.fixed_amount ?? 0)} · 부가세 {formatCurrency(item.taxAmount ?? 0)} · 합계 {formatCurrency(item.totalAmount ?? 0)}</p>
                <p className="mt-2 text-sm text-slate-600">현재 입금 {formatCurrency(item.paidAmount ?? 0)} · 부족 {formatCurrency(item.shortageAmount ?? 0)}</p>
                <p className="mt-2 text-xs text-slate-400">{formatDate(item.effective_from)} ~ {formatDate(item.effective_to)}</p>
              </div>
            )) : <p className="text-sm text-slate-500">표시할 분납 약정 기록이 없습니다.</p>
            ) : null}

            {tab === 'payments' ? (
              filteredPayments.length ? filteredPayments.map((item: any) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{item.reference_text ?? '입금 기록'}</p>
                  <Badge tone={statusTone(item.payment_status)}>{item.payment_status}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">{item.cases?.title ?? '사건'}</p>
                <p className="mt-2 text-sm text-slate-600">{formatCurrency(item.amount)} · {item.payment_method}</p>
                <p className="mt-2 text-xs text-slate-400">{formatDateTime(item.received_at)}</p>
              </div>
            )) : <p className="text-sm text-slate-500">표시할 입금 기록이 없습니다.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
