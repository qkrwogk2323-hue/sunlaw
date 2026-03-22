import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { listDocumentHistory } from '@/lib/queries/documents';

/**
 * @rule-meta-start
 * surfaceScope: organization
 * requiresAuth: true
 * requiresTraceability: false
 * traceEntity: documents_history
 * @rule-meta-end
 */
export const dynamic = 'force-dynamic';

export default async function DocumentHistoryPage() {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const history = await listDocumentHistory(organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">문서 기록</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>문서 등록·삭제 기록</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {history.auditLogs.length ? history.auditLogs.map((item: any) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{item.meta?.title ?? '문서'}</p>
                  <Badge tone="slate">{item.action}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600">{item.actor?.full_name ?? '구성원'} · {formatDateTime(item.created_at)}</p>
              </div>
            )) : <p className="text-sm text-slate-500">표시할 기록이 없습니다.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>문서 검토 기록</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {history.reviewLogs.length ? history.reviewLogs.map((item: any) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{item.case_document_id}</p>
                  <Badge tone={item.request_status === 'approved' ? 'green' : item.request_status === 'rejected' ? 'red' : 'amber'}>{item.request_status}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600">요청 {item.requested_by_name ?? '-'} · 처리 {item.decided_by_name ?? '-'} · {formatDateTime(item.decided_at ?? item.created_at)}</p>
                {item.comment ? <p className="mt-2 text-sm text-slate-500">{item.comment}</p> : null}
              </div>
            )) : <p className="text-sm text-slate-500">표시할 검토 기록이 없습니다.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
