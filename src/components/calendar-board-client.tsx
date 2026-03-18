'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { CalendarDays, CalendarRange, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Plus } from 'lucide-react';
import { addScheduleAction, updateScheduleAction } from '@/lib/actions/case-actions';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type ScheduleItem = {
  id: string;
  title: string;
  schedule_kind: string;
  scheduled_start: string;
  scheduled_end?: string | null;
  location?: string | null;
  notes?: string | null;
  is_important?: boolean | null;
  client_visibility?: string | null;
  case_id?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  cases?: { title?: string | null } | Array<{ title?: string | null }> | null;
};

type RequestItem = {
  id: string;
  title: string;
  body?: string | null;
  status: string;
  request_kind?: string | null;
  due_at?: string | null;
  case_id?: string | null;
  cases?: { title?: string | null } | Array<{ title?: string | null }> | null;
  assigned?: { full_name?: string | null } | Array<{ full_name?: string | null }> | null;
  creator?: { full_name?: string | null } | Array<{ full_name?: string | null }> | null;
};

type BillingItem = {
  id: string;
  title: string;
  amount: number;
  status: string;
  due_on?: string | null;
  notes?: string | null;
  case_id?: string | null;
  cases?: { title?: string | null } | Array<{ title?: string | null }> | null;
};

function relatedTitle(value?: { title?: string | null } | Array<{ title?: string | null }> | null) {
  if (Array.isArray(value)) return value[0]?.title ?? null;
  return value?.title ?? null;
}

type CaseOption = {
  id: string;
  title: string;
};

type Snapshot = {
  focusMonth: string;
  schedules: ScheduleItem[];
  requests: RequestItem[];
  billingEntries: BillingItem[];
};

type UnifiedEntry = {
  id: string;
  source: 'schedule' | 'request' | 'billing';
  title: string;
  when: string;
  caseId: string | null;
  caseTitle: string;
  detail: string;
  badge: string;
  tone: 'blue' | 'amber' | 'green' | 'slate';
  isImportant: boolean;
  isNew: boolean;
  ownerScope: 'personal' | 'organization';
  raw?: ScheduleItem;
};

type CalendarCell = {
  key: string;
  date: Date;
  inMonth: boolean;
};

function calendarDotClass(ownerScope: UnifiedEntry['ownerScope']) {
  if (ownerScope === 'personal') {
    return 'bg-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,0.18),0_1px_4px_rgba(5,150,105,0.28)]';
  }

  return 'bg-rose-500 shadow-[0_0_0_1px_rgba(244,63,94,0.16),0_1px_4px_rgba(225,29,72,0.28)]';
}

function toDateInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toDateTimeInputFromDateKey(dateKey: string) {
  const date = new Date(`${dateKey}T09:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function monthShift(month: string, delta: number) {
  const [year, monthIndex] = month.split('-').map(Number);
  const date = new Date(year, monthIndex - 1 + delta, 1);
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
}

function toLocalDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildCalendarCells(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);
  const focusDate = new Date(year, monthIndex - 1, 1);
  const gridStart = new Date(focusDate);
  const weekday = (gridStart.getDay() + 6) % 7;
  gridStart.setDate(1 - weekday);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      key: toLocalDateKey(date),
      date,
      inMonth: date.getMonth() === focusDate.getMonth()
    } satisfies CalendarCell;
  });
}

export function CalendarBoardClient({
  organizationId,
  currentUserId,
  canManage,
  snapshot,
  caseOptions
}: {
  organizationId: string | null;
  currentUserId: string;
  canManage: boolean;
  snapshot: Snapshot;
  caseOptions: CaseOption[];
}) {
  const [scope, setScope] = useState<'merged' | 'personal' | 'organization'>('merged');
  const [category, setCategory] = useState<'today' | 'week' | 'important' | 'new'>('today');
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [createCaseId, setCreateCaseId] = useState(caseOptions[0]?.id ?? '');
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [createScheduledStart, setCreateScheduledStart] = useState(() => toDateInput(snapshot.schedules[0]?.scheduled_start) || toDateTimeInputFromDateKey(toLocalDateKey(new Date())));
  const [currentMoment] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(toLocalDateKey(new Date()).startsWith(snapshot.focusMonth) ? toLocalDateKey(new Date()) : null);
  const [recentEntryCutoff] = useState(() => Date.now() - 1000 * 60 * 60 * 48);

  const todayKey = toLocalDateKey(currentMoment);
  const weekLaterTime = useMemo(() => {
    const next = new Date(currentMoment);
    next.setDate(currentMoment.getDate() + 7);
    return next.getTime();
  }, [currentMoment]);

  const entries = useMemo<UnifiedEntry[]>(() => {
    const scheduleEntries = snapshot.schedules.map((item) => {
      const updatedSource = item.updated_at || item.created_at || item.scheduled_start;
      const isNew = Boolean(item.case_id) && new Date(updatedSource || item.scheduled_start).getTime() >= recentEntryCutoff;
      return {
        id: item.id,
        source: 'schedule' as const,
        title: item.title,
        when: item.scheduled_start,
        caseId: item.case_id ?? null,
        caseTitle: relatedTitle(item.cases) ?? '공통 일정',
        detail: item.location || item.notes || '일정 상세를 확인하세요.',
        badge: item.schedule_kind,
        tone: item.is_important ? 'amber' as const : 'blue' as const,
        isImportant: Boolean(item.is_important),
        isNew,
        ownerScope: item.created_by === currentUserId ? 'personal' as const : 'organization' as const,
        raw: item
      };
    });

    const requestEntries = snapshot.requests
      .filter((item) => item.due_at)
      .map((item) => ({
        id: item.id,
        source: 'request' as const,
        title: item.title,
        when: item.due_at as string,
        caseId: item.case_id ?? null,
        caseTitle: relatedTitle(item.cases) ?? '공통 요청',
        detail: item.body || '요청 상세를 확인하세요.',
        badge: item.status,
        tone: 'green' as const,
        isImportant: item.status === 'open',
        isNew: false,
        ownerScope: 'organization' as const
      }));

    const billingEntries = snapshot.billingEntries
      .filter((item) => item.due_on)
      .map((item) => ({
        id: item.id,
        source: 'billing' as const,
        title: item.title,
        when: `${item.due_on}T09:00:00+09:00`,
        caseId: item.case_id ?? null,
        caseTitle: relatedTitle(item.cases) ?? '공통 비용',
        detail: `${formatCurrency(item.amount)} · ${item.status}`,
        badge: 'billing',
        tone: 'amber' as const,
        isImportant: true,
        isNew: false,
        ownerScope: 'organization' as const
      }));

    return [...scheduleEntries, ...requestEntries, ...billingEntries].sort((a, b) => new Date(a.when).getTime() - new Date(b.when).getTime());
  }, [currentUserId, recentEntryCutoff, snapshot.billingEntries, snapshot.requests, snapshot.schedules]);

  const scopedEntries = useMemo(() => entries.filter((entry) => {
    if (scope === 'personal') return entry.ownerScope === 'personal';
    if (scope === 'organization') return entry.ownerScope === 'organization';
    return true;
  }), [entries, scope]);

  const visibleEntries = useMemo(() => scopedEntries.filter((entry) => {
    const entryDate = new Date(entry.when);
    const entryKey = toLocalDateKey(entryDate);
    if (category === 'today') return entryKey === todayKey;
    if (category === 'week') return entryDate.getTime() <= weekLaterTime;
    if (category === 'important') return entry.isImportant;
    return entry.isNew;
  }), [category, scopedEntries, todayKey, weekLaterTime]);

  const calendarCells = useMemo(() => buildCalendarCells(snapshot.focusMonth), [snapshot.focusMonth]);

  const entriesByDay = useMemo(() => {
    const mapped = new Map<string, UnifiedEntry[]>();
    for (const entry of scopedEntries) {
      const key = toLocalDateKey(entry.when);
      const existing = mapped.get(key);
      if (existing) {
        existing.push(entry);
      } else {
        mapped.set(key, [entry]);
      }
    }
    return mapped;
  }, [scopedEntries]);

  const selectedEntries = selectedDateKey ? (entriesByDay.get(selectedDateKey) ?? []) : visibleEntries;

  const summary = {
    today: scopedEntries.filter((entry) => toLocalDateKey(entry.when) === todayKey).length,
    week: scopedEntries.filter((entry) => new Date(entry.when).getTime() <= weekLaterTime).length,
    important: scopedEntries.filter((entry) => entry.isImportant).length,
    new: scopedEntries.filter((entry) => entry.isNew).length,
    personal: entries.filter((entry) => entry.ownerScope === 'personal').length,
    organization: entries.filter((entry) => entry.ownerScope === 'organization').length
  };

  const prevMonth = monthShift(snapshot.focusMonth, -1);
  const nextMonth = monthShift(snapshot.focusMonth, 1);

  const categoryCards = [
    { key: 'today' as const, label: '오늘', value: summary.today, icon: Clock3 },
    { key: 'week' as const, label: '이번 주', value: summary.week, icon: CalendarDays },
    { key: 'important' as const, label: '중요', value: summary.important, icon: CheckCircle2 },
    { key: 'new' as const, label: 'NEW', value: summary.new, icon: CalendarRange }
  ];

  const weekdayLabels = ['월', '화', '수', '목', '금', '토', '일'];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">일정 확인</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">개인 일정과 조직 일정을 한 화면에서 확인합니다.</h1>
            <p className="mt-2 text-sm text-slate-600">NEW 배지는 사건 연동 일정이 최근 갱신된 경우에만 바로 표시됩니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/calendar?month=${prevMonth}` as Route} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700">
              <ChevronLeft className="size-4" />이전 달
            </Link>
            <div className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900">{snapshot.focusMonth}</div>
            <Link href={`/calendar?month=${nextMonth}` as Route} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700">
              다음 달<ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {categoryCards.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setCategory(item.key)}
            className={`rounded-2xl border p-4 text-left transition ${category === item.key ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`}
          >
            <item.icon className={`size-5 ${category === item.key ? 'text-white' : 'text-slate-700'}`} />
            <p className={`mt-3 text-xs font-semibold tracking-[0.18em] ${category === item.key ? 'text-slate-200' : 'text-slate-500'}`}>{item.label}</p>
            <p className="mt-2 text-3xl font-semibold">{item.value}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
          {[
            { key: 'merged' as const, label: '합쳐서 보기' },
            { key: 'personal' as const, label: `내 일정 ${summary.personal}` },
            { key: 'organization' as const, label: `조직 일정 ${summary.organization}` }
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setScope(item.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${scope === item.key ? 'bg-slate-950 text-white' : 'text-slate-600'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="text-sm text-slate-500">현재 보기 · {scope === 'merged' ? '합쳐서 보기' : scope === 'personal' ? '내 일정만' : '조직 일정만'}</div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>월간 일정</CardTitle>
            {selectedDateKey ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedDateKey(null)}>
                날짜 선택 해제
              </Button>
            ) : null}
          </div>
          <p className="text-sm text-slate-500">날짜를 누르면 아래 목록이 해당 날짜 일정으로 바뀝니다.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {weekdayLabels.map((label) => (
                  <div key={label} className="rounded-lg bg-slate-100 px-1 py-1.5 text-center text-[11px] font-semibold text-slate-600 sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm">
                    {label}
                  </div>
                ))}
                {calendarCells.map((cell) => {
                  const dayEntries = entriesByDay.get(cell.key) ?? [];
                  const isToday = cell.key === todayKey;
                  const isSelected = cell.key === selectedDateKey;
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => {
                        setSelectedDateKey((current) => current === cell.key ? null : cell.key);
                        if (canManage) {
                          setCreateFormOpen(true);
                          setCreateScheduledStart(toDateTimeInputFromDateKey(cell.key));
                        }
                      }}
                      className={`min-h-20 rounded-xl border p-1.5 text-left transition sm:min-h-28 sm:p-2 lg:min-h-36 lg:rounded-2xl lg:p-3 ${isSelected ? 'border-slate-950 bg-slate-950 text-white' : isToday ? 'border-sky-300 bg-sky-50 text-slate-900' : cell.inMonth ? 'border-slate-200 bg-white text-slate-900' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-xs font-semibold sm:text-sm ${isSelected ? 'text-white' : isToday ? 'text-sky-700' : ''}`}>{cell.date.getDate()}</span>
                        {dayEntries.length ? (
                          <span className={`hidden rounded-full px-2 py-0.5 text-xs font-semibold sm:inline-flex ${isSelected ? 'bg-white/18 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            {dayEntries.length}건
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1 sm:mt-2 lg:hidden">
                        {dayEntries.slice(0, 6).map((entry) => (
                          <span
                            key={`${cell.key}-${entry.source}-${entry.id}`}
                            className={`size-2.5 rounded-full ${calendarDotClass(entry.ownerScope)}`}
                            title={`${entry.ownerScope === 'personal' ? '내 일정' : '조직 일정'} · ${entry.title}`}
                          />
                        ))}
                        {dayEntries.length > 6 ? (
                          <span className={`text-[10px] font-medium ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>+{dayEntries.length - 6}</span>
                        ) : null}
                      </div>
                      <div className="mt-3 hidden space-y-1.5 lg:block">
                        {dayEntries.slice(0, 3).map((entry) => (
                          <div
                            key={`${cell.key}-${entry.source}-${entry.id}`}
                            className={`rounded-lg px-2 py-1.5 text-xs ${isSelected ? 'bg-white/12 text-white' : entry.isImportant ? 'bg-amber-50 text-amber-900' : entry.isNew ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className={`size-2 rounded-full ${calendarDotClass(entry.ownerScope)}`} />
                              <span className="truncate font-medium">{entry.title}</span>
                              {entry.isNew ? <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${isSelected ? 'bg-emerald-400/25 text-emerald-100' : 'bg-emerald-100 text-emerald-700'}`}>NEW</span> : null}
                            </div>
                            <p className={`mt-1 truncate ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>{entry.caseTitle}</p>
                          </div>
                        ))}
                        {dayEntries.length > 3 ? (
                          <p className={`text-xs ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>외 {dayEntries.length - 3}건</p>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        개인 일정은 내가 직접 등록한 일정이고, 조직 일정은 사건 일정·요청 마감·비용 후속 일정을 함께 보여줍니다.
      </div>

      {canManage ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
              <Plus className="size-4 text-slate-700" />
                <CardTitle>일정 등록</CardTitle>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => setCreateFormOpen((current) => !current)}>
                {createFormOpen ? '닫기' : '등록 열기'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {!createFormOpen ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                날짜를 누르면 해당 날짜로 일정 등록이 바로 열립니다. 기본 화면은 일정 목록 확인에 집중합니다.
              </div>
            ) : (
              <form action={createCaseId ? addScheduleAction.bind(null, createCaseId) : undefined} className="grid gap-3 xl:grid-cols-[1.1fr_1.4fr_0.9fr_1fr_auto]">
                <input type="hidden" name="clientVisibility" value="internal_only" />
                <select
                  value={createCaseId}
                  onChange={(event) => setCreateCaseId(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  {caseOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.title}</option>
                  ))}
                </select>
                <Input name="title" placeholder="일정 제목" required />
                <select name="scheduleKind" defaultValue="deadline" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900">
                  <option value="hearing">기일</option>
                  <option value="deadline">마감</option>
                  <option value="meeting">회의</option>
                  <option value="reminder">리마인더</option>
                  <option value="collection_visit">방문회수</option>
                  <option value="other">기타</option>
                </select>
                <Input name="scheduledStart" type="datetime-local" required value={createScheduledStart} onChange={(event) => setCreateScheduledStart(event.target.value)} />
                <Button type="submit" disabled={!organizationId || !createCaseId}>등록</Button>
                <details className="xl:col-span-5">
                  <summary className="cursor-pointer text-sm font-medium text-slate-600">추가 항목</summary>
                  <div className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
                    <Input name="location" placeholder="장소" className="md:col-span-2" />
                    <Textarea name="notes" placeholder="메모" className="md:col-span-2 min-h-24" />
                    <label className="flex items-center gap-2 text-sm text-slate-600 md:col-span-2">
                      <input type="checkbox" name="isImportant" className="size-4 rounded border-slate-300" />
                      중요 일정으로 표시
                    </label>
                  </div>
                </details>
              </form>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{selectedDateKey ? `${formatDate(selectedDateKey)} 일정` : '다가오는 일정보기'}</CardTitle>
            <Badge tone="blue">{selectedEntries.length}건</Badge>
          </div>
          <p className="text-sm text-slate-500">
            {selectedDateKey ? '선택한 날짜의 일정을 보여줍니다. 다시 누르면 선택이 해제됩니다.' : '초록색 NEW는 최근 갱신된 사건 연동 일정만 표시합니다.'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedEntries.length ? (
            selectedEntries.map((entry) => {
              const editable = canManage && entry.source === 'schedule' && entry.raw;
              return (
                <div key={`${entry.source}-${entry.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{entry.title}</p>
                        <Badge tone={entry.tone}>{entry.badge}</Badge>
                        {entry.isImportant ? <Badge tone="amber">중요</Badge> : null}
                        {entry.isNew ? <Badge tone="green">NEW</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{entry.caseTitle} · {formatDateTime(entry.when)}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{entry.detail}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={entry.ownerScope === 'personal' ? 'blue' : 'slate'}>{entry.ownerScope === 'personal' ? '내 일정' : '조직 일정'}</Badge>
                      {entry.caseId ? <Link href={`/cases/${entry.caseId}` as Route} className="text-sm font-medium text-sky-700 underline underline-offset-4">사건 보기</Link> : null}
                      {editable ? (
                        <button type="button" onClick={() => setEditingScheduleId((current) => current === entry.id ? null : entry.id)} className="text-sm font-medium text-slate-700 underline underline-offset-4">
                          {editingScheduleId === entry.id ? '편집 닫기' : '관리자 편집'}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {editable && editingScheduleId === entry.id && entry.raw ? (
                    <form action={updateScheduleAction.bind(null, entry.id)} className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                      <input type="hidden" name="clientVisibility" value="internal_only" />
                      <Input name="title" defaultValue={entry.raw.title} required className="md:col-span-2" />
                      <select name="scheduleKind" defaultValue={entry.raw.schedule_kind} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900">
                        <option value="hearing">기일</option>
                        <option value="deadline">마감</option>
                        <option value="meeting">회의</option>
                        <option value="reminder">리마인더</option>
                        <option value="collection_visit">방문회수</option>
                        <option value="other">기타</option>
                      </select>
                      <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-500">
                        공통 일정은 내부 전용으로만 관리됩니다.
                      </div>
                      <Input name="scheduledStart" type="datetime-local" defaultValue={toDateInput(entry.raw.scheduled_start)} required />
                      <Input name="scheduledEnd" type="datetime-local" defaultValue={toDateInput(entry.raw.scheduled_end)} />
                      <Input name="location" defaultValue={entry.raw.location || ''} placeholder="장소" className="md:col-span-2" />
                      <Textarea name="notes" defaultValue={entry.raw.notes || ''} className="md:col-span-2" />
                      <label className="flex items-center gap-2 text-sm text-slate-600 md:col-span-2">
                        <input type="checkbox" name="isImportant" defaultChecked={Boolean(entry.raw.is_important)} className="size-4 rounded border-slate-300" />
                        중요 일정으로 유지
                      </label>
                      <div className="md:col-span-2">
                        <Button type="submit">일정 수정 저장</Button>
                      </div>
                    </form>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">현재 선택한 보기 조건에 맞는 일정이 없습니다.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
