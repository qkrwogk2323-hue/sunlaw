import { createSupabaseServerClient } from '@/lib/supabase/server';

function parseFocusMonth(month?: string | null) {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year, monthIndex] = month.split('-').map(Number);
    return new Date(year, monthIndex - 1, 1);
  }

  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const weekday = copy.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export async function listCalendarEntries(organizationId?: string | null) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('case_schedules')
    .select('id, title, schedule_kind, scheduled_start, scheduled_end, location, notes, is_important, client_visibility, case_id, created_by, created_at, updated_at, cases(title)')
    .order('scheduled_start', { ascending: true })
    .limit(50);

  if (organizationId) query = query.eq('organization_id', organizationId);

  const { data } = await query;
  return data ?? [];
}

export async function getCalendarBoardSnapshot(organizationId?: string | null, month?: string | null) {
  const supabase = await createSupabaseServerClient();
  const focusMonth = parseFocusMonth(month);
  const monthStart = new Date(focusMonth.getFullYear(), focusMonth.getMonth(), 1);
  const monthEnd = new Date(focusMonth.getFullYear(), focusMonth.getMonth() + 1, 0, 23, 59, 59, 999);
  const yearStart = new Date(focusMonth.getFullYear(), 0, 1);
  const yearEnd = new Date(focusMonth.getFullYear() + 1, 0, 0, 23, 59, 59, 999);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const weekStart = startOfWeek(today);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  let schedulesQuery = supabase
    .from('case_schedules')
    .select('id, title, schedule_kind, scheduled_start, scheduled_end, location, notes, is_important, client_visibility, case_id, created_by, created_by_name, created_at, updated_at, cases(title)')
    .gte('scheduled_start', yearStart.toISOString())
    .lte('scheduled_start', yearEnd.toISOString())
    .order('scheduled_start', { ascending: true })
    .limit(500);

  let requestsQuery = supabase
    .from('case_requests')
    .select('id, title, body, status, request_kind, due_at, case_id, cases(title), assigned:profiles!case_requests_assigned_to_fkey(full_name, email), creator:profiles(full_name, email)')
    .gte('due_at', yearStart.toISOString())
    .lte('due_at', yearEnd.toISOString())
    .in('status', ['open', 'in_review', 'waiting_client'])
    .order('due_at', { ascending: true })
    .limit(500);

  let billingQuery = supabase
    .from('billing_entries')
    .select('id, title, amount, status, due_on, case_id, notes, cases(title)')
    .gte('due_on', yearStart.toISOString().slice(0, 10))
    .lte('due_on', yearEnd.toISOString().slice(0, 10))
    .in('status', ['draft', 'issued', 'partial'])
    .order('due_on', { ascending: true })
    .limit(500);

  if (organizationId) {
    schedulesQuery = schedulesQuery.eq('organization_id', organizationId);
    requestsQuery = requestsQuery.eq('organization_id', organizationId);
    billingQuery = billingQuery.eq('organization_id', organizationId);
  }

  const [{ data: schedules }, { data: requests }, { data: billingEntries }] = await Promise.all([
    schedulesQuery,
    requestsQuery,
    billingQuery
  ]);

  return {
    focusMonth: `${focusMonth.getFullYear()}-${`${focusMonth.getMonth() + 1}`.padStart(2, '0')}`,
    monthStart: monthStart.toISOString(),
    monthEnd: monthEnd.toISOString(),
    yearStart: yearStart.toISOString(),
    yearEnd: yearEnd.toISOString(),
    today: today.toISOString(),
    tomorrow: tomorrow.toISOString(),
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    schedules: schedules ?? [],
    requests: requests ?? [],
    billingEntries: billingEntries ?? []
  };
}
