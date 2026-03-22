import { createSupabaseServerClient } from '@/lib/supabase/server';

function dueStatus(dueOn?: string | null) {
  if (!dueOn) return 'undated';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(`${dueOn}T00:00:00`);
  if (Number.isNaN(dueDate.getTime())) return 'undated';
  if (dueDate.getTime() < today.getTime()) return 'overdue';
  return 'upcoming';
}

export async function getBillingHubSnapshot(organizationId?: string | null) {
  const supabase = await createSupabaseServerClient();

  let entriesQuery = supabase
    .from('billing_entries')
    .select('id, title, amount, tax_amount, total_amount, status, due_on, paid_at, notes, entry_kind, created_at, case_id, bill_to_case_client_id, bill_to_case_organization_id, cases(title, reference_no)')
    .order('created_at', { ascending: false })
    .limit(200);

  let agreementsQuery = supabase
    .from('fee_agreements')
    .select('id, title, agreement_type, fixed_amount, rate, effective_from, effective_to, is_active, description, terms_json, created_at, case_id, bill_to_case_client_id, bill_to_case_organization_id, cases(title, reference_no)')
    .order('created_at', { ascending: false })
    .limit(120);

  let paymentsQuery = supabase
    .from('payments')
    .select('id, amount, payment_status, payment_method, received_at, reference_text, note, case_id, payer_case_client_id, payer_case_organization_id, cases(title, reference_no)')
    .order('received_at', { ascending: false })
    .limit(200);

  if (organizationId) {
    entriesQuery = entriesQuery.eq('organization_id', organizationId);
    agreementsQuery = agreementsQuery.eq('organization_id', organizationId);
    paymentsQuery = paymentsQuery.eq('organization_id', organizationId);
  }

  const [{ data: entries }, { data: agreements }, { data: payments }] = await Promise.all([
    entriesQuery,
    agreementsQuery,
    paymentsQuery
  ]);

  const clientIds = [...new Set((entries ?? []).map((item: any) => item.bill_to_case_client_id).concat((agreements ?? []).map((item: any) => item.bill_to_case_client_id)).filter(Boolean))];
  const caseOrganizationIds = [...new Set((entries ?? []).map((item: any) => item.bill_to_case_organization_id).concat((agreements ?? []).map((item: any) => item.bill_to_case_organization_id)).filter(Boolean))];

  const [{ data: clients }, { data: caseOrganizations }] = await Promise.all([
    clientIds.length
      ? supabase.from('case_clients').select('id, client_name').in('id', clientIds)
      : Promise.resolve({ data: [] as any[] }),
    caseOrganizationIds.length
      ? supabase.from('case_organizations').select('id, organization:organizations(name)').in('id', caseOrganizationIds)
      : Promise.resolve({ data: [] as any[] })
  ]);

  const clientMap = new Map((clients ?? []).map((item: any) => [item.id, item.client_name]));
  const caseOrganizationMap = new Map((caseOrganizations ?? []).map((item: any) => [item.id, item.organization?.name ?? '참여 조직']));

  const normalizedEntries = (entries ?? []).map((item: any) => ({
    ...item,
    totalAmount: Number(item.total_amount ?? (Number(item.amount ?? 0) + Number(item.tax_amount ?? 0))),
    dueStatus: dueStatus(item.due_on),
    targetLabel: item.bill_to_case_client_id
      ? clientMap.get(item.bill_to_case_client_id) ?? '의뢰인'
      : item.bill_to_case_organization_id
        ? caseOrganizationMap.get(item.bill_to_case_organization_id) ?? '참여 조직'
        : '청구 대상 미지정'
  }));

  const paymentGroupMap = new Map<string, { amount: number; latestAt: string | null }>();
  (payments ?? []).forEach((payment: any) => {
    if (payment.payment_status !== 'confirmed') return;
    const key = `${payment.case_id ?? ''}:${payment.payer_case_client_id ?? ''}:${payment.payer_case_organization_id ?? ''}`;
    const existing = paymentGroupMap.get(key) ?? { amount: 0, latestAt: null };
    const latestAt = existing.latestAt && existing.latestAt > `${payment.received_at ?? ''}`
      ? existing.latestAt
      : (payment.received_at ?? null);
    paymentGroupMap.set(key, {
      amount: existing.amount + Number(payment.amount ?? 0),
      latestAt
    });
  });

  const normalizedAgreements = (agreements ?? []).map((item: any) => ({
    ...item,
    paidAmount: paymentGroupMap.get(`${item.case_id ?? ''}:${item.bill_to_case_client_id ?? ''}:${item.bill_to_case_organization_id ?? ''}`)?.amount ?? 0,
    recentPaymentAt: paymentGroupMap.get(`${item.case_id ?? ''}:${item.bill_to_case_client_id ?? ''}:${item.bill_to_case_organization_id ?? ''}`)?.latestAt ?? null,
    shortageAmount: Math.max(
      Number(item.fixed_amount ?? 0)
      - (paymentGroupMap.get(`${item.case_id ?? ''}:${item.bill_to_case_client_id ?? ''}:${item.bill_to_case_organization_id ?? ''}`)?.amount ?? 0),
      0
    ),
    targetLabel: item.bill_to_case_client_id
      ? clientMap.get(item.bill_to_case_client_id) ?? '의뢰인'
      : item.bill_to_case_organization_id
        ? caseOrganizationMap.get(item.bill_to_case_organization_id) ?? '참여 조직'
        : '청구 대상 미지정'
  }));

  const expectedThisMonth = normalizedEntries.reduce((sum: number, item: any) => {
    if (!item.due_on) return sum;
    const due = new Date(`${item.due_on}T00:00:00`);
    const now = new Date();
    if (due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth()) {
      return sum + Number(item.totalAmount ?? 0);
    }
    return sum;
  }, 0);

  return {
    entries: normalizedEntries,
    agreements: normalizedAgreements,
    payments: payments ?? [],
    summary: {
      openEntryCount: normalizedEntries.length,
      overdueEntryCount: normalizedEntries.filter((item: any) => item.dueStatus === 'overdue').length,
      activeAgreementCount: normalizedAgreements.filter((item: any) => item.is_active).length,
      expectedThisMonth
    }
  };
}
