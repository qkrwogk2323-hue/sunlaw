'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useState } from 'react';
import { buttonStyles } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DangerActionButton } from '@/components/ui/danger-action-button';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { Textarea } from '@/components/ui/textarea';
import { deleteSelectedDocumentsAction, deleteDocumentAction, addOrganizationDocumentAction } from '@/lib/actions/case-actions';
import { formatDateTime } from '@/lib/format';

type DocumentItem = {
  id: string;
  title: string;
  document_kind: string;
  approval_status: string;
  client_visibility: string;
  updated_at: string | null;
  file_size: number | null;
  case_id: string | null;
  organization_id: string;
  storage_path: string | null;
  cases?: {
    id?: string | null;
    title?: string | null;
  } | null;
};

function caseSourceLabel(item: DocumentItem): string {
  if (!item.cases) return '사건 연결 없음';
  return item.cases.title ?? '(제목 없음)';
}

export function DocumentsClient({ documents }: { documents: DocumentItem[] }) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === documents.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(documents.map((d) => d.id)));
    }
  }

  const hasSelection = selected.size > 0;

  return (
    <div className="space-y-6">
      <div className="vs-brand-panel overflow-hidden rounded-[1.8rem] p-6 text-white shadow-[0_24px_54px_rgba(8,47,73,0.26)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">업로드 문서</h1>
            <p className="mt-1 text-sm text-white/70">조직 문서를 업로드하고 관리합니다.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setUploadOpen((v) => !v)}
              className={buttonStyles({
                variant: uploadOpen ? 'destructive' : 'secondary',
                size: 'sm',
                className: uploadOpen
                  ? 'h-9 rounded-xl px-3 text-xs'
                  : 'h-9 rounded-xl px-3 text-xs !bg-white/90 !text-slate-900 hover:!bg-white'
              })}
              aria-expanded={uploadOpen}
              aria-label={uploadOpen ? '업로드 섹션 닫기' : '새 문서 업로드'}
            >
              {uploadOpen ? '✕ 닫기' : '+ 문서 업로드'}
            </button>
            <Link
              href={'/documents/history' as Route}
              className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs !bg-white/90 !text-slate-900 hover:!bg-white' })}
            >
              문서 기록 보기
            </Link>
          </div>
        </div>
      </div>

      {uploadOpen && (
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
          <CardHeader>
            <CardTitle>문서 업로드</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientActionForm
              action={addOrganizationDocumentAction}
              successTitle="문서를 등록했습니다."
              errorCause="문서 업로드에 필요한 정보를 확인하지 못했습니다."
              errorResolution="제목과 파일을 다시 확인해 주세요."
              className="grid gap-3 md:grid-cols-2"
            >
              <Input name="title" placeholder="문서 제목" required aria-required="true" className="md:col-span-2" />
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
      )}

      <Card className="vs-mesh-card">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CardTitle>업로드 문서 목록</CardTitle>
              <Badge tone="slate">{documents.length}</Badge>
            </div>
            {documents.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleAll}
                  className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-8 rounded-lg px-3 text-xs' })}
                  aria-label="전체 선택/해제"
                >
                  {selected.size === documents.length ? '전체 해제' : '전체 선택'}
                </button>
                {hasSelection && (
                  <ClientActionForm
                    action={async (formData) => {
                      selected.forEach((id) => formData.append('documentIds', id));
                      return deleteSelectedDocumentsAction(formData);
                    }}
                    successTitle="선택한 문서를 삭제했습니다."
                    errorCause="삭제 권한이 없거나 선택된 문서가 없습니다."
                    errorResolution="권한을 확인하거나 다시 시도해 주세요."
                    className="inline-flex"
                  >
                    <SubmitButton variant="destructive" pendingLabel="삭제 중..." className="h-8 rounded-lg px-3 text-xs">
                      선택 삭제 ({selected.size})
                    </SubmitButton>
                  </ClientActionForm>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {documents.length ? documents.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border bg-white/85 p-4 transition-colors ${selected.has(item.id) ? 'border-blue-300 bg-blue-50/40' : 'border-slate-200'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                    aria-label={`${item.title} 선택`}
                  />
                  <div>
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{caseSourceLabel(item)} · {item.document_kind} · {item.client_visibility}</p>
                    {item.file_size ? <p className="mt-1 text-xs text-slate-400">{(item.file_size / 1024 / 1024).toFixed(1)}MB</p> : null}
                    <p className="mt-2 text-xs text-slate-400">{formatDateTime(item.updated_at)}</p>
                  </div>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={item.approval_status === 'approved' ? 'green' : item.approval_status === 'pending_review' ? 'amber' : 'slate'}>{item.approval_status}</Badge>
                  <Link
                    href={(item.case_id ? `/cases/${item.case_id}` : `/api/documents/${item.id}/download`) as Route}
                    className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-8 rounded-lg px-3 text-xs' })}
                  >
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
          )) : (
            <div className="py-12 text-center text-slate-400">
              <p className="font-medium">아직 업로드된 문서가 없습니다.</p>
              <p className="mt-1 text-sm">상단 버튼을 눌러 첫 문서를 등록해 주세요.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
