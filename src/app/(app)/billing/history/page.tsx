import { Badge } from '@/components/ui/badge';
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

function statusTone(status: string) {
  if (status === 'paid' || status === 'confirmed' || status === 'approved') return 'green' as const;
  if (status === 'overdue' || status === 'rejected') return 'red' as const;
  if (status === 'pending_review' || status === 'issued' || status === 'partial') return 'amber' as const;
  return 'slate' as const;
}

export default async function BillingHistoryPage() {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const billing = await getBillingHubSnapshot(organizationId);

  const remunerationEntries = billing.entries.filter((item: any) => ['retainer_fee', 'flat_fee', 'success_fee', 'service_fee', 'adjustment', 'discount'].includes(item.entry_kind));
  const publicChargeEntries = billing.entries.filter((item: any) => ['expense', 'court_fee'].includes(item.entry_kind));
  const installmentAgreements = billing.agreements.filter((item: any) => item.agreement_type === 'installment_plan');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">비용 기록</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>보수 기록</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {remunerationEntries.length ? remunerationEntries.map((item: any) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">{item.cases?.title ?? '사건'} · {item.targetLabel}</p>
                <p className="mt-2 text-sm text-slate-600">공급가액 {formatCurrency(item.amount)} · 부가세 {formatCurrency(item.tax_amount ?? 0)} · 합계 {formatCurrency(item.totalAmount)}</p>
                <p className="mt-2 text-xs text-slate-400">{formatDate(item.due_on)} · {formatDateTime(item.created_at)}</p>
              </div>
            )) : <p className="text-sm text-slate-500">표시할 보수 기록이 없습니다.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>공과금 기록</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {publicChargeEntries.length ? publicChargeEntries.map((item: any) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">{item.cases?.title ?? '사건'} · {item.targetLabel}</p>
                <p className="mt-2 text-sm text-slate-600">공급가액 {formatCurrency(item.amount)} · 부가세 {formatCurrency(item.tax_amount ?? 0)} · 합계 {formatCurrency(item.totalAmount)}</p>
                <p className="mt-2 text-xs text-slate-400">{formatDate(item.due_on)} · {formatDateTime(item.created_at)}</p>
              </div>
            )) : <p className="text-sm text-slate-500">표시할 공과금 기록이 없습니다.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>분할납부약정금액 기록</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {installmentAgreements.length ? installmentAgreements.map((item: any) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <Badge tone={item.is_active ? 'blue' : 'slate'}>{item.is_active ? '활성' : '비활성'}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">{item.cases?.title ?? '사건'} · {item.targetLabel}</p>
                <p className="mt-2 text-sm text-slate-600">약정금액 {formatCurrency(item.fixed_amount ?? 0)} · 현재 입금 {formatCurrency(item.paidAmount ?? 0)} · 부족 {formatCurrency(item.shortageAmount ?? 0)}</p>
                <p className="mt-2 text-xs text-slate-400">{formatDate(item.effective_from)} ~ {formatDate(item.effective_to)}</p>
              </div>
            )) : <p className="text-sm text-slate-500">표시할 분납 약정 기록이 없습니다.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>입금 기록</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {billing.payments.length ? billing.payments.map((item: any) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{item.reference_text ?? '입금 기록'}</p>
                  <Badge tone={statusTone(item.payment_status)}>{item.payment_status}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">{item.cases?.title ?? '사건'}</p>
                <p className="mt-2 text-sm text-slate-600">{formatCurrency(item.amount)} · {item.payment_method}</p>
                <p className="mt-2 text-xs text-slate-400">{formatDateTime(item.received_at)}</p>
              </div>
            )) : <p className="text-sm text-slate-500">표시할 입금 기록이 없습니다.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
