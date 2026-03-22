import Link from 'next/link';
import type { Route } from 'next';
import { buttonStyles } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DangerActionButton } from '@/components/ui/danger-action-button';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { Textarea } from '@/components/ui/textarea';
import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { listCases } from '@/lib/queries/cases';
import { listDocuments } from '@/lib/queries/documents';
import { addDocumentFromLibraryAction, deleteSelectedDocumentsAction, deleteDocumentAction } from '@/lib/actions/case-actions';
import { formatDateTime } from '@/lib/format';

export default async function DocumentsPage() {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const [documents, cases] = await Promise.all([
    listDocuments(organizationId),
    organizationId ? listCases(organizationId) : Promise.resolve([])
  ]);

  return (
    <div className="space-y-6">
      <div className="vs-brand-panel overflow-hidden rounded-[1.8rem] p-6 text-white shadow-[0_24px_54px_rgba(8,47,73,0.26)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">업로드 문서</h1>
          </div>
          <Link href={'/documents/history' as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs !bg-white/90 !text-slate-900 hover:!bg-white' })}>
            문서 기록 보기
          </Link>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
          <CardHeader>
            <CardTitle>문서 업로드</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientActionForm
              action={addDocumentFromLibraryAction}
              successTitle="문서를 등록했습니다."
              errorCause="문서 업로드에 필요한 정보를 확인하지 못했습니다."
              errorResolution="사건, 제목, 파일을 다시 확인해 주세요."
              className="grid gap-3 md:grid-cols-2"
            >
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="document-case">
                  연결 사건
                </label>
                <select id="document-case" name="caseId" required className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900">
                  <option value="">사건 선택</option>
                  {cases.map((item: any) => (
                    <option key={item.id} value={item.id}>{item.title}</option>
                  ))}
                </select>
              </div>
              <Input name="title" placeholder="문서 제목" required className="md:col-span-2" />
              <select name="documentKind" defaultValue="brief" className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900">
                <option value="complaint">소장</option>
                <option value="answer">답변서</option>
                <option value="brief">준비서면</option>
                <option value="evidence">증거</option>
                <option value="contract">계약서</option>
                <option value="order">명령/결정문</option>
                <option value="notice">안내문</option>
                <option value="opinion">의견서</option>
                <option value="internal_memo">내부메모</option>
                <option value="other">기타</option>
              </select>
              <select name="clientVisibility" defaultValue="internal_only" className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900">
                <option value="internal_only">내부 전용</option>
                <option value="client_visible">의뢰인 공개</option>
              </select>
              <input name="file" type="file" className="md:col-span-2 block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-600" />
              <Textarea name="summary" placeholder="문서 요약" className="md:col-span-2" />
              <Textarea name="contentMarkdown" placeholder="텍스트 본문 또는 메모" className="md:col-span-2" />
              <div className="md:col-span-2">
                <SubmitButton pendingLabel="문서 저장 중...">문서 업로드</SubmitButton>
              </div>
            </ClientActionForm>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-red-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
          <CardHeader>
            <CardTitle>선택 문서 삭제</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">목록에서 체크한 문서를 한 번에 삭제합니다.</p>
            <ClientActionForm
              id="bulk-document-delete-form"
              action={deleteSelectedDocumentsAction}
              successTitle="선택한 문서를 삭제했습니다."
              errorCause="삭제할 문서를 선택하지 않았거나 권한이 없습니다."
              errorResolution="문서를 선택한 뒤 다시 시도해 주세요."
              className="space-y-3"
            >
              <SubmitButton variant="destructive" pendingLabel="삭제 중...">선택 문서 삭제</SubmitButton>
            </ClientActionForm>
          </CardContent>
        </Card>
      </div>

      <Card className="vs-mesh-card">
        <CardHeader><CardTitle>업로드 문서 목록</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {documents.length ? documents.map((item: any) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white/85 p-4">
              <div className="flex items-start justify-between gap-3">
                <label className="flex items-start gap-3">
                  <input type="checkbox" name="documentIds" value={item.id} form="bulk-document-delete-form" className="mt-1 h-4 w-4 rounded border-slate-300" />
                  <div>
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.cases?.title ?? '사건 연결 없음'} · {item.document_kind} · {item.client_visibility}</p>
                    {item.file_size ? <p className="mt-1 text-xs text-slate-400">{(item.file_size / 1024 / 1024).toFixed(1)}MB</p> : null}
                    <p className="mt-2 text-xs text-slate-400">{formatDateTime(item.updated_at)}</p>
                  </div>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={item.approval_status === 'approved' ? 'green' : item.approval_status === 'pending_review' ? 'amber' : 'slate'}>{item.approval_status}</Badge>
                  <Link href={(item.case_id ? `/cases/${item.case_id}` : `/api/documents/${item.id}/download`) as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-8 rounded-lg px-3 text-xs' })}>
                    열기
                  </Link>
                  <DangerActionButton
                    action={deleteDocumentAction}
                    fields={{ documentId: item.id }}
                    confirmTitle="문서를 삭제할까요?"
                    confirmDescription="삭제한 문서는 바로 복구할 수 없습니다."
                    highlightedInfo={item.title}
                    successTitle="문서를 삭제했습니다."
                    errorCause="문서를 삭제할 권한이 없거나 이미 삭제되었습니다."
                    buttonSize="sm"
                    className="h-8 rounded-lg px-3 text-xs"
                  >
                    삭제
                  </DangerActionButton>
                </div>
              </div>
            </div>
          )) : <p className="text-sm text-slate-500">표시할 문서가 없습니다.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
