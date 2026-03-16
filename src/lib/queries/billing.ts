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
    .select('id, title, amount, tax_amount, status, due_on, notes, entry_kind, created_at, case_id, bill_to_case_client_id, bill_to_case_organization_id, cases(title, reference_no)')
    .in('status', ['draft', 'issued', 'partial'])
    .order('due_on', { ascending: true, nullsFirst: false })
    .limit(60);

  let agreementsQuery = supabase
    .from('fee_agreements')
    .select('id, title, agreement_type, fixed_amount, rate, effective_from, effective_to, is_active, case_id, bill_to_case_client_id, bill_to_case_organization_id, cases(title, reference_no)')
    .order('created_at', { ascending: false })
    .limit(30);

  let paymentsQuery = supabase
    .from('payments')
    .select('id, amount, payment_status, payment_method, received_at, reference_text, case_id, cases(title, reference_no)')
    .order('received_at', { ascending: false })
    .limit(20);

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
    dueStatus: dueStatus(item.due_on),
    targetLabel: item.bill_to_case_client_id
      ? clientMap.get(item.bill_to_case_client_id) ?? '의뢰인'
      : item.bill_to_case_organization_id
        ? caseOrganizationMap.get(item.bill_to_case_organization_id) ?? '참여 조직'
        : '청구 대상 미지정'
  }));

  const normalizedAgreements = (agreements ?? []).map((item: any) => ({
    ...item,
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
      return sum + Number(item.amount ?? 0) + Number(item.tax_amount ?? 0);
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