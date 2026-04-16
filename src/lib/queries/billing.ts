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
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(120);

  let agreementsQuery = supabase
    .from('fee_agreements')
    .select('id, title, agreement_type, fixed_amount, rate, effective_from, effective_to, is_active, description, terms_json, created_at, case_id, bill_to_case_client_id, bill_to_case_organization_id, cases(title, reference_no)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(80);

  let paymentsQuery = supabase
    .from('payments')
    .select('id, amount, payment_status, payment_method, received_at, reference_text, note, case_id, payer_case_client_id, payer_case_organization_id, cases(title, reference_no)')
    .order('received_at', { ascending: false })
    .limit(120);

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

  const caseIds = [...new Set((entries ?? []).map((item: any) => item.case_id).concat((agreements ?? []).map((item: any) => item.case_id)).concat((payments ?? []).map((item: any) => item.case_id)).filter(Boolean))];
  const clientIds = [...new Set((entries ?? []).map((item: any) => item.bill_to_case_client_id).concat((agreements ?? []).map((item: any) => item.bill_to_case_client_id)).filter(Boolean))];
  const caseOrganizationIds = [...new Set((entries ?? []).map((item: any) => item.bill_to_case_organization_id).concat((agreements ?? []).map((item: any) => item.bill_to_case_organization_id)).filter(Boolean))];

  const [{ data: clients }, { data: caseOrganizations }, { data: hubs }] = await Promise.all([
    clientIds.length
      ? supabase.from('case_clients').select('id, client_name').in('id', clientIds)
      : Promise.resolve({ data: [] as any[] }),
    caseOrganizationIds.length
      ? supabase.from('case_organizations').select('id, organization:organizations(name)').in('id', caseOrganizationIds)
      : Promise.resolve({ data: [] as any[] }),
    caseIds.length
      ? supabase.from('case_hubs').select('id, case_id, title').in('case_id', caseIds)
      : Promise.resolve({ data: [] as any[] })
  ]);

  const clientMap = new Map((clients ?? []).map((item: any) => [item.id, item.client_name]));
  const caseOrganizationMap = new Map((caseOrganizations ?? []).map((item: any) => [item.id, item.organization?.name ?? '참여 조직']));
  const hubMap = new Map((hubs ?? []).map((item: any) => [item.case_id, { id: item.id, title: item.title ?? '사건허브' }]));

  const normalizedEntries = (entries ?? []).map((item: any) => ({
    ...item,
    totalAmount: Number(item.total_amount ?? (Number(item.amount ?? 0) + Number(item.tax_amount ?? 0))),
    dueStatus: dueStatus(item.due_on),
    hub: item.case_id ? (hubMap.get(item.case_id) ?? null) : null,
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
    taxAmount: Number(item.terms_json?.tax_amount ?? 0),
    totalAmount: Number(item.fixed_amount ?? 0) + Number(item.terms_json?.tax_amount ?? 0),
    hub: item.case_id ? (hubMap.get(item.case_id) ?? null) : null,
    paidAmount: paymentGroupMap.get(`${item.case_id ?? ''}:${item.bill_to_case_client_id ?? ''}:${item.bill_to_case_organization_id ?? ''}`)?.amount ?? 0,
    recentPaymentAt: paymentGroupMap.get(`${item.case_id ?? ''}:${item.bill_to_case_client_id ?? ''}:${item.bill_to_case_organization_id ?? ''}`)?.latestAt ?? null,
    shortageAmount: Math.max(
      (Number(item.fixed_amount ?? 0) + Number(item.terms_json?.tax_amount ?? 0))
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
    hubs: hubs ?? [],
    summary: {
      openEntryCount: normalizedEntries.length,
      overdueEntryCount: normalizedEntries.filter((item: any) => item.dueStatus === 'overdue').length,
      activeAgreementCount: normalizedAgreements.filter((item: any) => item.is_active).length,
      expectedThisMonth
    }
  };
}

export async function getBillingPageSnapshot(organizationId?: string | null) {
  const supabase = await createSupabaseServerClient();

  let entriesQuery = supabase
    .from('billing_entries')
    .select('id, title, amount, tax_amount, total_amount, status, due_on, paid_at, notes, entry_kind, created_at, case_id, bill_to_case_client_id, bill_to_case_organization_id, cases(title, reference_no)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(120);

  let agreementsQuery = supabase
    .from('fee_agreements')
    .select('id, title, agreement_type, fixed_amount, rate, effective_from, effective_to, is_active, description, terms_json, created_at, case_id, bill_to_case_client_id, bill_to_case_organization_id, cases(title, reference_no)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(80);

  let paymentsQuery = supabase
    .from('payments')
    .select('amount, received_at, case_id, payer_case_client_id, payer_case_organization_id')
    .eq('payment_status', 'confirmed')
    .order('received_at', { ascending: false })
    .limit(160);

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

  const caseIds = [...new Set((entries ?? []).map((item: any) => item.case_id).concat((agreements ?? []).map((item: any) => item.case_id)).filter(Boolean))];
  const clientIds = [...new Set((entries ?? []).map((item: any) => item.bill_to_case_client_id).concat((agreements ?? []).map((item: any) => item.bill_to_case_client_id)).filter(Boolean))];
  const caseOrganizationIds = [...new Set((entries ?? []).map((item: any) => item.bill_to_case_organization_id).concat((agreements ?? []).map((item: any) => item.bill_to_case_organization_id)).filter(Boolean))];

  const [{ data: clients }, { data: caseOrganizations }, { data: hubs }] = await Promise.all([
    clientIds.length
      ? supabase.from('case_clients').select('id, client_name').in('id', clientIds)
      : Promise.resolve({ data: [] as any[] }),
    caseOrganizationIds.length
      ? supabase.from('case_organizations').select('id, organization:organizations(name)').in('id', caseOrganizationIds)
      : Promise.resolve({ data: [] as any[] }),
    caseIds.length
      ? supabase.from('case_hubs').select('id, case_id, title').in('case_id', caseIds)
      : Promise.resolve({ data: [] as any[] })
  ]);

  const clientMap = new Map((clients ?? []).map((item: any) => [item.id, item.client_name]));
  const caseOrganizationMap = new Map((caseOrganizations ?? []).map((item: any) => [item.id, item.organization?.name ?? '참여 조직']));
  const hubMap = new Map((hubs ?? []).map((item: any) => [item.case_id, { id: item.id, title: item.title ?? '사건허브' }]));
  const paymentGroupMap = new Map<string, { amount: number; latestAt: string | null }>();

  (payments ?? []).forEach((payment: any) => {
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

  const normalizedEntries = (entries ?? []).map((item: any) => ({
    ...item,
    totalAmount: Number(item.total_amount ?? (Number(item.amount ?? 0) + Number(item.tax_amount ?? 0))),
    dueStatus: dueStatus(item.due_on),
    hub: item.case_id ? (hubMap.get(item.case_id) ?? null) : null,
    targetLabel: item.bill_to_case_client_id
      ? clientMap.get(item.bill_to_case_client_id) ?? '의뢰인'
      : item.bill_to_case_organization_id
        ? caseOrganizationMap.get(item.bill_to_case_organization_id) ?? '참여 조직'
        : '청구 대상 미지정'
  }));

  const normalizedAgreements = (agreements ?? []).map((item: any) => ({
    ...item,
    taxAmount: Number(item.terms_json?.tax_amount ?? 0),
    totalAmount: Number(item.fixed_amount ?? 0) + Number(item.terms_json?.tax_amount ?? 0),
    hub: item.case_id ? (hubMap.get(item.case_id) ?? null) : null,
    paidAmount: paymentGroupMap.get(`${item.case_id ?? ''}:${item.bill_to_case_client_id ?? ''}:${item.bill_to_case_organization_id ?? ''}`)?.amount ?? 0,
    recentPaymentAt: paymentGroupMap.get(`${item.case_id ?? ''}:${item.bill_to_case_client_id ?? ''}:${item.bill_to_case_organization_id ?? ''}`)?.latestAt ?? null,
    shortageAmount: Math.max(
      (Number(item.fixed_amount ?? 0) + Number(item.terms_json?.tax_amount ?? 0))
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
    summary: {
      openEntryCount: normalizedEntries.length,
      overdueEntryCount: normalizedEntries.filter((item: any) => item.dueStatus === 'overdue').length,
      activeAgreementCount: normalizedAgreements.filter((item: any) => item.is_active).length,
      expectedThisMonth
    }
  };
}

export async function getBillingHistorySnapshot(organizationId?: string | null) {
  const supabase = await createSupabaseServerClient();

  let entriesQuery = supabase
    .from('billing_entries')
    .select('id, title, amount, tax_amount, total_amount, status, due_on, created_at, entry_kind, case_id, bill_to_case_client_id, bill_to_case_organization_id, cases(title, reference_no)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(120);

  let agreementsQuery = supabase
    .from('fee_agreements')
    .select('id, title, agreement_type, fixed_amount, effective_from, effective_to, is_active, terms_json, created_at, case_id, bill_to_case_client_id, bill_to_case_organization_id, cases(title, reference_no)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);

  let paymentsQuery = supabase
    .from('payments')
    .select('id, amount, payment_status, payment_method, received_at, reference_text, case_id, payer_case_client_id, payer_case_organization_id, cases(title, reference_no)')
    .order('received_at', { ascending: false })
    .limit(120);

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

  return {
    entries: (entries ?? []).map((item: any) => ({
      ...item,
      totalAmount: Number(item.total_amount ?? (Number(item.amount ?? 0) + Number(item.tax_amount ?? 0))),
      targetLabel: item.bill_to_case_client_id
        ? clientMap.get(item.bill_to_case_client_id) ?? '의뢰인'
        : item.bill_to_case_organization_id
          ? caseOrganizationMap.get(item.bill_to_case_organization_id) ?? '참여 조직'
          : '청구 대상 미지정'
    })),
    agreements: (agreements ?? []).map((item: any) => ({
      ...item,
      taxAmount: Number(item.terms_json?.tax_amount ?? 0),
      totalAmount: Number(item.fixed_amount ?? 0) + Number(item.terms_json?.tax_amount ?? 0),
      paidAmount: paymentGroupMap.get(`${item.case_id ?? ''}:${item.bill_to_case_client_id ?? ''}:${item.bill_to_case_organization_id ?? ''}`)?.amount ?? 0,
      recentPaymentAt: paymentGroupMap.get(`${item.case_id ?? ''}:${item.bill_to_case_client_id ?? ''}:${item.bill_to_case_organization_id ?? ''}`)?.latestAt ?? null,
      shortageAmount: Math.max(
        (Number(item.fixed_amount ?? 0) + Number(item.terms_json?.tax_amount ?? 0))
        - (paymentGroupMap.get(`${item.case_id ?? ''}:${item.bill_to_case_client_id ?? ''}:${item.bill_to_case_organization_id ?? ''}`)?.amount ?? 0),
        0
      ),
      targetLabel: item.bill_to_case_client_id
        ? clientMap.get(item.bill_to_case_client_id) ?? '의뢰인'
        : item.bill_to_case_organization_id
          ? caseOrganizationMap.get(item.bill_to_case_organization_id) ?? '참여 조직'
          : '청구 대상 미지정'
    })),
    payments: payments ?? []
  };
}

// 사건별 연체 건수 집계 — 대시보드 허브 모음 뷰의 "미납 N" 표시에 사용.
// paid_at is null AND due_on < today 인 billing_entries 수를 case_id 별로 카운트한다.
export async function getOverdueCountsByCaseIds(
  caseIds: string[]
): Promise<Record<string, number>> {
  if (!caseIds.length) return {};
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('billing_entries')
    .select('case_id')
    .in('case_id', caseIds)
    .is('paid_at', null)
    .lt('due_on', today)
    .is('deleted_at', null);
  if (error) {
    console.error('[getOverdueCountsByCaseIds] query error:', error.message);
    return {};
  }
  const result: Record<string, number> = {};
  for (const row of (data ?? []) as Array<{ case_id: string | null }>) {
    if (!row.case_id) continue;
    result[row.case_id] = (result[row.case_id] ?? 0) + 1;
  }
  return result;
}

export async function getBillingCaseOptions(organizationId?: string | null) {
  const supabase = await createSupabaseServerClient();
  const [{ data: caseRows }, { data: caseClientRows }, { data: caseOrganizationRows }] = await Promise.all([
    supabase
      .from('cases')
      .select('id, title')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(80),
    supabase
      .from('case_clients')
      .select('id, case_id, client_name')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(240),
    supabase
      .from('case_organizations')
      .select('id, case_id, organization:organizations(name)')
      .eq('organization_id', organizationId)
  ]);

  return (caseRows ?? []).map((item: any) => ({
    id: item.id,
    title: item.title,
    clients: (caseClientRows ?? [])
      .filter((client: any) => client.case_id === item.id)
      .map((client: any) => ({ id: client.id, name: client.client_name })),
    organizations: (caseOrganizationRows ?? [])
      .filter((row: any) => row.case_id === item.id)
      .map((row: any) => ({ id: row.id, name: row.organization?.name ?? '참여 조직' }))
  }));
}

export async function getContractWorkspace(organizationId?: string | null) {
  const supabase = await createSupabaseServerClient();

  let agreementsQuery = supabase
    .from('fee_agreements')
    .select('id, title, agreement_type, fixed_amount, rate, effective_from, effective_to, is_active, description, terms_json, created_at, case_id, bill_to_case_client_id, bill_to_case_organization_id, cases(title, reference_no)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(120);

  if (organizationId) {
    agreementsQuery = agreementsQuery.eq('organization_id', organizationId);
  }

  const { data: agreements } = await agreementsQuery;
  const caseIds = [...new Set((agreements ?? []).map((item: any) => item.case_id).filter(Boolean))];
  const clientIds = [...new Set((agreements ?? []).map((item: any) => item.bill_to_case_client_id).filter(Boolean))];
  const caseOrganizationIds = [...new Set((agreements ?? []).map((item: any) => item.bill_to_case_organization_id).filter(Boolean))];

  const [{ data: clients }, { data: caseOrganizations }, { data: hubs }] = await Promise.all([
    clientIds.length
      ? supabase.from('case_clients').select('id, client_name').in('id', clientIds)
      : Promise.resolve({ data: [] as any[] }),
    caseOrganizationIds.length
      ? supabase.from('case_organizations').select('id, organization:organizations(name)').in('id', caseOrganizationIds)
      : Promise.resolve({ data: [] as any[] }),
    caseIds.length
      ? supabase.from('case_hubs').select('id, case_id, title').in('case_id', caseIds)
      : Promise.resolve({ data: [] as any[] })
  ]);

  const clientMap = new Map((clients ?? []).map((item: any) => [item.id, item.client_name]));
  const caseOrganizationMap = new Map((caseOrganizations ?? []).map((item: any) => [item.id, item.organization?.name ?? '참여 조직']));
  const hubMap = new Map((hubs ?? []).map((item: any) => [item.case_id, { id: item.id, title: item.title ?? '사건허브' }]));

  return (agreements ?? []).map((item: any) => ({
    ...item,
    taxAmount: Number(item.terms_json?.tax_amount ?? 0),
    totalAmount: Number(item.fixed_amount ?? 0) + Number(item.terms_json?.tax_amount ?? 0),
    hub: item.case_id ? (hubMap.get(item.case_id) ?? null) : null,
    paidAmount: 0,
    recentPaymentAt: null,
    shortageAmount: 0,
    targetLabel: item.bill_to_case_client_id
      ? clientMap.get(item.bill_to_case_client_id) ?? '의뢰인'
      : item.bill_to_case_organization_id
        ? caseOrganizationMap.get(item.bill_to_case_organization_id) ?? '참여 조직'
        : '청구 대상 미지정'
  }));
}
