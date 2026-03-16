import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';

export async function getCalendarExportRows(organizationId?: string | null) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('case_schedules')
    .select('title, schedule_kind, scheduled_start, scheduled_end, location, client_visibility, is_important, cases(title)')
    .order('scheduled_start', { ascending: true })
    .limit(500);

  if (organizationId) query = query.eq('organization_id', organizationId);
  const { data } = await query;

  return (data ?? []).map((item: any) => ({
    사건명: item.cases?.title ?? '-',
    일정명: item.title,
    유형: item.schedule_kind,
    시작: formatDateTime(item.scheduled_start),
    종료: formatDateTime(item.scheduled_end),
    장소: item.location ?? '-',
    공개범위: item.client_visibility,
    중요도: item.is_important ? '중요' : '일반'
  }));
}

export async function getCaseBoardExportRows(organizationId?: string | null) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('cases')
    .select('reference_no, title, case_type, case_status, stage_key, principal_amount, court_name, case_number, updated_at')
    .order('updated_at', { ascending: false })
    .limit(500);

  if (organizationId) query = query.eq('organization_id', organizationId);
  const { data } = await query;

  return (data ?? []).map((item: any) => ({
    관리번호: item.reference_no ?? '-',
    사건명: item.title,
    사건유형: item.case_type,
    상태: item.case_status,
    단계: item.stage_key ?? '-',
    청구원금: formatCurrency(item.principal_amount),
    법원: item.court_name ?? '-',
    사건번호: item.case_number ?? '-',
    최근변경: formatDateTime(item.updated_at)
  }));
}

export async function getBillingExportRows(caseId: string) {
  const supabase = await createSupabaseServerClient();
  const [{ data: agreements }, { data: entries }, { data: invoices }, { data: payments }] = await Promise.all([
    supabase
      .from('fee_agreements')
      .select('title, agreement_type, fixed_amount, rate, effective_from, effective_to, is_active')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false }),
    supabase
      .from('billing_entries')
      .select('title, entry_kind, amount, tax_amount, total_amount, status, due_on, occurred_on, billable_on')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select('invoice_no, title, status, total_amount, issued_at, due_on, paid_at')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false }),
    supabase
      .from('payments')
      .select('amount, payment_status, payment_method, received_at, reference_text')
      .eq('case_id', caseId)
      .order('received_at', { ascending: false })
  ]);

  const rows: Record<string, unknown>[] = [];
  (agreements ?? []).forEach((item: any) => rows.push({
    구분: '약정',
    제목: item.title,
    유형: item.agreement_type,
    금액: formatCurrency(item.fixed_amount),
    비율: item.rate == null ? '-' : `${item.rate}%`,
    시작일: formatDate(item.effective_from),
    종료일: formatDate(item.effective_to),
    상태: item.is_active ? '활성' : '비활성'
  }));
  (entries ?? []).forEach((item: any) => rows.push({
    구분: '청구항목',
    제목: item.title,
    유형: item.entry_kind,
    금액: formatCurrency(item.total_amount ?? item.amount),
    세액: formatCurrency(item.tax_amount),
    발생일: formatDate(item.occurred_on),
    청구가능일: formatDate(item.billable_on),
    납기: formatDate(item.due_on),
    상태: item.status
  }));
  (invoices ?? []).forEach((item: any) => rows.push({
    구분: '청구서',
    번호: item.invoice_no,
    제목: item.title,
    금액: formatCurrency(item.total_amount),
    발행일: formatDateTime(item.issued_at),
    납기: formatDate(item.due_on),
    납부일: formatDateTime(item.paid_at),
    상태: item.status
  }));
  (payments ?? []).forEach((item: any) => rows.push({
    구분: '입금',
    금액: formatCurrency(item.amount),
    수단: item.payment_method,
    수령일시: formatDateTime(item.received_at),
    참조: item.reference_text ?? '-',
    상태: item.payment_status
  }));

  return rows;
}

function toPeriodLabel(period: string) {
  const map: Record<string, string> = { day: '일별', week: '주별', month: '월별', quarter: '분기별', year: '연별' };
  return map[period] ?? '월별';
}

export async function getCollectionsExportRows(organizationId?: string | null, period = 'month') {
  const supabase = await createSupabaseServerClient();
  let caseQuery = supabase
    .from('cases')
    .select('id')
    .eq('case_type', 'debt_collection')
    .limit(500);
  if (organizationId) caseQuery = caseQuery.eq('organization_id', organizationId);
  const { data: caseRows } = await caseQuery;
  const caseIds = (caseRows ?? []).map((row: any) => row.id);
  const rows: Record<string, unknown>[] = [];
  if (!caseIds.length) return rows;

  const [{ data: perfRows }, { data: activities }] = await Promise.all([
    supabase
      .from('collection_performance_daily')
      .select('performance_date, recovered_amount, expected_compensation_amount, confirmed_compensation_amount')
      .in('case_id', caseIds)
      .order('performance_date', { ascending: false })
      .limit(1000),
    supabase
      .from('case_recovery_activities')
      .select('occurred_at, activity_kind, amount, outcome_status, cases(title)')
      .in('case_id', caseIds)
      .order('occurred_at', { ascending: false })
      .limit(300)
  ]);

  (perfRows ?? []).forEach((item: any) => rows.push({
    구분: `${toPeriodLabel(period)} 성과`,
    기준일: formatDate(item.performance_date),
    회수액: formatCurrency(item.recovered_amount),
    예상보수: formatCurrency(item.expected_compensation_amount),
    확정보수: formatCurrency(item.confirmed_compensation_amount)
  }));
  (activities ?? []).forEach((item: any) => rows.push({
    구분: '회수활동',
    사건명: item.cases?.title ?? '-',
    활동유형: item.activity_kind,
    금액: formatCurrency(item.amount),
    결과: item.outcome_status ?? '-',
    일시: formatDateTime(item.occurred_at)
  }));
  return rows;
}

export async function getReportExportRows(organizationId?: string | null) {
  const [cases, calendar, collections] = await Promise.all([
    getCaseBoardExportRows(organizationId),
    getCalendarExportRows(organizationId),
    getCollectionsExportRows(organizationId)
  ]);

  return [
    { 구분: '사건 수', 값: cases.length },
    { 구분: '일정 수', 값: calendar.length },
    { 구분: 'Collections 지표 수', 값: collections.length }
  ];
}
