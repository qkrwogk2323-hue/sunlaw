'use client';

import { useState, useCallback } from 'react';
import { buttonStyles } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  label = '로그',
  limit = 80
}: {
  organizationId?: string;
  label?: string;
  limit?: number;
}) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (organizationId) params.set('organizationId', organizationId);
      const res = await fetch(`/api/org-logs?${params.toString()}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.userMessage ?? '로그를 불러오지 못했습니다.');
      setLogs(json.logs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [organizationId, limit]);

  function handleOpen() {
    setOpen(true);
    void fetchLogs();
  }

  function handleClose() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-7 rounded-lg px-2.5 text-xs text-slate-500 hover:text-slate-700' })}
        aria-label="활동 로그 보기"
      >
        로그 ‹
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
                <h2 className="text-base font-semibold text-slate-900">활동 로그</h2>
                <p className="text-xs text-slate-500 mt-0.5">조직에서 발생한 최근 작업 기록입니다.</p>
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

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {loading && (
                <div className="py-10 text-center text-sm text-slate-400">로그를 불러오는 중...</div>
              )}
              {error && !loading && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              {!loading && !error && logs.length === 0 && (
                <div className="py-10 text-center text-slate-400">
                  <p className="font-medium">기록된 로그가 없습니다.</p>
                  <p className="mt-1 text-sm">조직에서 작업이 발생하면 여기에 표시됩니다.</p>
                </div>
              )}
              {!loading && logs.map((log) => (
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
