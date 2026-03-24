'use client';

import { useState, useCallback } from 'react';
import { buttonStyles } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

type LogEntry = {
  id: string;
  action: string;
  resource_type?: string | null;
  resource_id?: string | null;
  organization_id?: string | null;
  created_at?: string | null;
  actor?: { full_name?: string | null } | null;
  meta?: Record<string, unknown> | null;
};

function formatLogDate(value?: string | null): string {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function actionTone(action: string): 'green' | 'red' | 'amber' | 'blue' | 'slate' {
  if (action.includes('created') || action.includes('approved')) return 'green';
  if (action.includes('deleted') || action.includes('removed') || action.includes('rejected')) return 'red';
  if (action.includes('updated') || action.includes('changed') || action.includes('restored')) return 'amber';
  if (action.includes('invited') || action.includes('joined') || action.includes('linked')) return 'blue';
  return 'slate';
}

export function LogButton({
  organizationId,
  mode = 'activity',
  surface,
  tables = [],
  label = '로그',
  title = '활동 로그',
  description = '조직에서 발생한 최근 작업 기록입니다.',
  limit = 80
}: {
  organizationId?: string;
  mode?: 'activity' | 'change_log';
  /** 업무 도메인별 필터. 지정하면 해당 메뉴 관련 로그만 표시한다. */
  surface?: 'team' | 'clients' | 'cases' | 'billing' | 'collaboration' | 'platform' | 'all';
  tables?: string[];
  label?: string;
  title?: string;
  description?: string;
  limit?: number;
}) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(limit), mode });
      if (organizationId) params.set('organizationId', organizationId);
      if (surface) params.set('surface', surface);
      tables.forEach((table) => params.append('table', table));
      const res = await fetch(`/api/org-logs?${params.toString()}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.userMessage ?? '로그를 불러오지 못했습니다.');
      setLogs(json.logs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [organizationId, limit, mode, tables]);

  function handleOpen() {
    setOpen(true);
    void fetchLogs();
  }

  function handleClose() {
    setOpen(false);
  }

  const filteredLogs = logs.filter((log) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return [
      log.action,
      log.resource_type,
      log.resource_id,
      log.actor?.full_name,
      log.created_at,
      ...(Array.isArray(log.meta?.changed_fields) ? (log.meta?.changed_fields as string[]) : [])
    ]
      .filter(Boolean)
      .some((value) => `${value}`.toLowerCase().includes(needle));
  });

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-8 rounded-lg px-3 text-xs text-slate-600 hover:text-slate-800' })}
        aria-label="활동 로그 보기"
      >
        로그 기록
      </button>

      {open && (
        <dialog
          open
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          aria-label="활동 로그"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                <p className="mt-0.5 text-xs text-slate-500">{description}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void fetchLogs()}
                  disabled={loading}
                  className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-7 rounded-lg px-2.5 text-xs' })}
                  aria-label="새로고침"
                >
                  {loading ? '로딩...' : '새로고침'}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-7 w-7 rounded-lg p-0 flex items-center justify-center' })}
                  aria-label="닫기"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="border-b border-slate-100 px-5 py-4">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="날짜, 작업자, 작업 종류 검색"
                className="h-11 rounded-xl"
                aria-label="로그 기록 검색"
              />
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {loading && (
                <div className="py-10 text-center text-sm text-slate-400">로그를 불러오는 중...</div>
              )}
              {error && !loading && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              {!loading && !error && filteredLogs.length === 0 && (
                <div className="py-10 text-center text-slate-400">
                  <p className="font-medium">기록된 로그가 없습니다.</p>
                  <p className="mt-1 text-sm">현재 조건에 맞는 기록이 없습니다.</p>
                </div>
              )}
              {!loading && filteredLogs.map((log) => (
                <div key={log.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={actionTone(log.action)}>{log.action}</Badge>
                    {log.resource_type && <span className="text-xs text-slate-500">{log.resource_type}</span>}
                    <span className="ml-auto text-xs text-slate-400">{formatLogDate(log.created_at)}</span>
                  </div>
                  {(log.actor?.full_name || log.resource_id) && (
                    <div className="mt-1.5 text-xs text-slate-600">
                      {log.actor?.full_name && <span>작업자: {log.actor.full_name}</span>}
                      {log.actor?.full_name && log.resource_id && <span className="mx-1.5">·</span>}
                      {log.resource_id && <span>대상 ID: {log.resource_id}</span>}
                    </div>
                  )}
                  {Array.isArray(log.meta?.changed_fields) && (log.meta?.changed_fields as string[]).length ? (
                    <p className="mt-1.5 text-xs text-slate-500">변경 항목: {(log.meta?.changed_fields as string[]).join(', ')}</p>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
              최근 {limit}건까지 표시됩니다.
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}
