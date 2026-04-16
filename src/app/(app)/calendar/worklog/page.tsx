import Link from 'next/link';
import type { Route } from 'next';
import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { getCalendarWorklogSnapshot } from '@/lib/queries/calendar';
import { formatDateTime } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonStyles } from '@/components/ui/button';
import { ROUTES } from '@/lib/routes/registry';

function relatedTitle(value?: { title?: string | null } | Array<{ title?: string | null }> | null) {
  if (Array.isArray(value)) return value[0]?.title ?? null;
  return value?.title ?? null;
}

export default async function CalendarWorklogPage() {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const logs = await getCalendarWorklogSnapshot(organizationId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">업무일지</h1>
          <p className="mt-2 text-sm text-slate-600">일정 확인 화면에서 완료 처리하거나 취소한 일정이 자동으로 기록됩니다. 누가 언제 어떤 상태를 바꿨는지 시간순으로 확인합니다.</p>
        </div>
        <Link href={'/calendar' as Route} className={buttonStyles({ variant: 'secondary', className: 'min-h-10 rounded-xl px-4' })}>
          일정 확인으로 돌아가기
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>일정 처리 기록</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {logs.length ? logs.map((log: any) => (
            <div key={log.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{log.schedule_title}</p>
                  <p className="mt-1 text-sm text-slate-500">{relatedTitle(log.cases) ?? '공통 일정'} · {formatDateTime(log.schedule_scheduled_start)}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>{log.actor_name ?? '담당자 미상'}</p>
                  <p>{formatDateTime(log.created_at)}</p>
                </div>
              </div>
              <p className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700">{log.summary}</p>
              {log.case_id ? (
                <div className="mt-3">
                  <Link
                    href={`${ROUTES.CASES}/${log.case_id}?tab=schedule` as Route}
                    className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}
                  >
                    사건 일정으로 열기
                  </Link>
                </div>
              ) : null}
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              아직 일정 처리 기록이 없습니다. 일정 확인 화면에서 완료 체크나 취소 처리를 하면 여기에 기록됩니다.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
