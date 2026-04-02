import { createSupabaseServerClient } from '@/lib/supabase/server';

function getPeriodBounds(period: string) {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);
  const previousStart = new Date(now);
  const previousEnd = new Date(now);

  if (period === 'day') {
    start.setHours(0, 0, 0, 0);
    previousStart.setDate(start.getDate() - 1);
    previousStart.setHours(0, 0, 0, 0);
    previousEnd.setDate(start.getDate() - 1);
    previousEnd.setHours(23, 59, 59, 999);
  } else if (period === 'week') {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    start.setHours(0, 0, 0, 0);
    previousStart.setDate(start.getDate() - 7);
    previousStart.setHours(0, 0, 0, 0);
    previousEnd.setDate(start.getDate() - 1);
    previousEnd.setHours(23, 59, 59, 999);
  } else if (period === 'quarter') {
    const quarterStartMonth = Math.floor(start.getMonth() / 3) * 3;
    start.setMonth(quarterStartMonth, 1);
    start.setHours(0, 0, 0, 0);
    previousStart.setMonth(quarterStartMonth - 3, 1);
    previousStart.setHours(0, 0, 0, 0);
    previousEnd.setMonth(quarterStartMonth, 0);
    previousEnd.setHours(23, 59, 59, 999);
  } else if (period === 'year') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    previousStart.setFullYear(start.getFullYear() - 1, 0, 1);
    previousStart.setHours(0, 0, 0, 0);
    previousEnd.setFullYear(start.getFullYear() - 1, 11, 31);
    previousEnd.setHours(23, 59, 59, 999);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    previousStart.setMonth(start.getMonth() - 1, 1);
    previousStart.setHours(0, 0, 0, 0);
    previousEnd.setMonth(start.getMonth(), 0);
    previousEnd.setHours(23, 59, 59, 999);
  }

  return { start, end, previousStart, previousEnd };
}

function sumBy(rows: any[], key: string) {
  return rows.reduce((acc, row) => acc + Number(row?.[key] ?? 0), 0);
}

function percentDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

export async function getCollectionsWorkspace(organizationId?: string | null, period = 'month') {
  const supabase = await createSupabaseServerClient();
  const { start, end, previousStart, previousEnd } = getPeriodBounds(period);

  let casesQuery = supabase
    .from('cases')
    .select('id, title, reference_no, case_status, stage_key, principal_amount, updated_at, module_flags')
    .eq('case_type', 'debt_collection')
    .neq('lifecycle_status', 'soft_deleted')
    .order('updated_at', { ascending: false })
    .limit(50);

  let recoveryQuery = supabase
    .from('case_recovery_activities')
    .select('id, case_id, activity_kind, occurred_at, amount, outcome_status, created_by_name, cases(title)')
    .order('occurred_at', { ascending: false })
    .limit(50);

  if (organizationId) {
    casesQuery = casesQuery.eq('organization_id', organizationId);
    recoveryQuery = recoveryQuery.eq('organization_id', organizationId);
  }

  const [{ data: collectionCases }, { data: activities }] = await Promise.all([casesQuery, recoveryQuery]);
  const caseIds = (collectionCases ?? []).map((item: any) => item.id);

  let performanceRows: any[] = [];
  let compensationEntries: any[] = [];

  if (caseIds.length) {
    const [{ data: perfData }, { data: compData }] = await Promise.all([
      supabase
        .from('collection_performance_daily')
        .select('case_id, performance_date, recovered_amount, expected_compensation_amount, confirmed_compensation_amount, organization_membership_id')
        .in('case_id', caseIds)
        .gte('performance_date', previousStart.toISOString().slice(0, 10))
        .lte('performance_date', end.toISOString().slice(0, 10))
        .order('performance_date', { ascending: true }),
      supabase
        .from('collection_compensation_entries')
        .select('id, case_id, period_start, period_end, calculated_from_amount, calculated_amount, status, collection_compensation_plan_versions(collection_compensation_plans(title))')
        .in('case_id', caseIds)
        .order('created_at', { ascending: false })
        .limit(30)
    ]);

    performanceRows = perfData ?? [];
    compensationEntries = compData ?? [];
  }

  const currentRows = performanceRows.filter((row: any) => new Date(row.performance_date) >= start);
  const previousRows = performanceRows.filter((row: any) => {
    const d = new Date(row.performance_date);
    return d >= previousStart && d <= previousEnd;
  });

  const currentRecovered = sumBy(currentRows, 'recovered_amount');
  const previousRecovered = sumBy(previousRows, 'recovered_amount');
  const currentExpected = sumBy(currentRows, 'expected_compensation_amount');
  const previousExpected = sumBy(previousRows, 'expected_compensation_amount');
  const currentConfirmed = sumBy(currentRows, 'confirmed_compensation_amount');
  const previousConfirmed = sumBy(previousRows, 'confirmed_compensation_amount');

  const trend = currentRows.map((row: any) => ({
    label: row.performance_date,
    recoveredAmount: Number(row.recovered_amount ?? 0),
    expectedCompensationAmount: Number(row.expected_compensation_amount ?? 0),
    confirmedCompensationAmount: Number(row.confirmed_compensation_amount ?? 0)
  }));

  return {
    period,
    collectionCases: collectionCases ?? [],
    activities: activities ?? [],
    compensationEntries,
    metrics: {
      currentRecovered,
      previousRecovered,
      recoveredDelta: percentDelta(currentRecovered, previousRecovered),
      currentExpected,
      previousExpected,
      expectedDelta: percentDelta(currentExpected, previousExpected),
      currentConfirmed,
      previousConfirmed,
      confirmedDelta: percentDelta(currentConfirmed, previousConfirmed)
    },
    trend
  };
}

export async function getCollectionsCaseCount(organizationId?: string | null) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('cases')
    .select('id', { count: 'exact', head: true })
    .eq('case_type', 'debt_collection');

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { count } = await query;
  return count ?? 0;
}
