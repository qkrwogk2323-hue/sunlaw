import Link from 'next/link';
import type { Route } from 'next';
import { buttonStyles } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { listDocuments } from '@/lib/queries/documents';
import { formatDateTime } from '@/lib/format';

export default async function DocumentsPage() {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const documents = await listDocuments(organizationId);

  return (
    <div className="space-y-6">
      <div className="vs-brand-panel overflow-hidden rounded-[1.8rem] p-6 text-white shadow-[0_24px_54px_rgba(8,47,73,0.26)]">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">문서 흐름</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200/88">사건 문서와 결재 상태를 같은 흐름으로 묶어 문서 검토와 승인 판단이 빠르게 이어지도록 구성했습니다.</p>
      </div>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">문서 목록</h2>
        <p className="mt-2 text-sm text-slate-600">사건별 문서 상태와 최근 변경 흐름을 한곳에서 확인합니다.</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link href={'/admin/audit?tab=general&table=case_documents' as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>
            문서 등록·수정 기록 보기
          </Link>
          <Link href={'/admin/audit?tab=general&table=case_document_reviews' as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>
            문서 검토·승인 기록 보기
          </Link>
        </div>
      </div>
      <Card className="vs-mesh-card">
        <CardHeader><CardTitle>문서 목록</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {documents.length ? documents.map((item: any) => (
            <Link key={item.id} href={`/cases/${item.case_id}`} className="vs-interactive block rounded-xl border border-slate-200 bg-white/85 p-4 transition hover:border-slate-900">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{item.title}</p>
                <Badge tone={item.approval_status === 'approved' ? 'green' : item.approval_status === 'pending_review' ? 'amber' : 'slate'}>{item.approval_status}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">{item.cases?.title ?? '-'} · {item.document_kind} · {item.client_visibility}</p>
              <p className="mt-2 text-xs text-slate-400">{formatDateTime(item.updated_at)}</p>
            </Link>
          )) : <p className="text-sm text-slate-500">표시할 문서가 없습니다.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
