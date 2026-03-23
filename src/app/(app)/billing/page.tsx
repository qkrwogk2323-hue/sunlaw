import Link from 'next/link';
import type { Route } from 'next';
import { BillingComingSoonCards } from '@/components/billing-coming-soon-cards';
import { buttonStyles } from '@/components/ui/button';
import { BillingEntrySectionPanel } from '@/components/forms/billing-entry-section-panel';
import { InstallmentAgreementSectionPanel } from '@/components/forms/installment-agreement-section-panel';
import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { getBillingHubSnapshot } from '@/lib/queries/billing';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function BillingPage() {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const supabase = await createSupabaseServerClient();
  const [billing, { data: caseRows }, { data: caseClientRows }] = await Promise.all([
    getBillingHubSnapshot(organizationId),
    supabase
      .from('cases')
      .select('id, title')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(150),
    supabase
      .from('case_clients')
      .select('id, case_id, client_name')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(400)
  ]);

  const openStatuses = new Set(['draft', 'issued', 'partial']);
  const clientVisibleEntries = billing.entries.filter((entry: any) => Boolean(entry.bill_to_case_client_id));
  const clientAttentionEntries = clientVisibleEntries.filter((entry: any) => openStatuses.has(entry.status)).slice(0, 8);
  const remunerationEntries = billing.entries.filter((entry: any) => ['retainer_fee', 'flat_fee', 'success_fee', 'service_fee', 'adjustment', 'discount'].includes(entry.entry_kind));
  const publicChargeEntries = billing.entries.filter((entry: any) => ['expense', 'court_fee'].includes(entry.entry_kind));
  const installmentAgreements = billing.agreements.filter((agreement: any) => agreement.agreement_type === 'installment_plan' && agreement.is_active);
  const { data: realCaseOrganizationRows } = await supabase
    .from('case_organizations')
    .select('id, case_id, organization:organizations(name)')
    .in('case_id', (caseRows ?? []).map((item: any) => item.id));

  const caseOptions = (caseRows ?? []).map((item: any) => ({
    id: item.id,
    title: item.title,
    clients: (caseClientRows ?? [])
      .filter((client: any) => client.case_id === item.id)
      .map((client: any) => ({ id: client.id, name: client.client_name })),
    organizations: (realCaseOrganizationRows ?? [])
      .filter((row: any) => row.case_id === item.id)
      .map((row: any) => ({ id: row.id, name: row.organization?.name ?? '참여 조직' }))
  }));

  const remunerationTypeOptions = [
    { value: 'retainer_fee', label: '착수금' },
    { value: 'flat_fee', label: '정액 보수' },
    { value: 'success_fee', label: '성공보수' },
    { value: 'service_fee', label: '서비스 수수료' },
    { value: 'adjustment', label: '조정' },
    { value: 'discount', label: '할인' }
  ];
  const publicChargeTypeOptions = [
    { value: 'expense', label: '실비' },
    { value: 'court_fee', label: '인지대/송달료' }
  ];
  const outstandingTypeOptions = [
    ...remunerationTypeOptions,
    ...publicChargeTypeOptions
  ];
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

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {topCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 transition hover:border-slate-300"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 leading-tight">{card.label}</p>
            <p className="mt-3 text-center text-2xl font-semibold text-slate-950 tabular-nums">{card.value}</p>
          </Link>
        ))}
      </section>

      <BillingComingSoonCards />

      <section className="grid gap-6 xl:grid-cols-2">
        <BillingEntrySectionPanel
          title="보수"
          createLabel="보수 추가"
          caseOptions={caseOptions}
          items={remunerationEntries}
          entryTypeOptions={remunerationTypeOptions}
        />
        <BillingEntrySectionPanel
          title="공과금"
          createLabel="공과금 추가"
          caseOptions={caseOptions}
          items={publicChargeEntries}
          entryTypeOptions={publicChargeTypeOptions}
        />
        <InstallmentAgreementSectionPanel caseOptions={caseOptions} items={installmentAgreements} />
        <BillingEntrySectionPanel
          title="미납 금액"
          createLabel="미납 항목 추가"
          caseOptions={caseOptions}
          items={clientAttentionEntries}
          entryTypeOptions={outstandingTypeOptions}
          forceClientTarget
        />
      </section>
    </div>
  );
}
