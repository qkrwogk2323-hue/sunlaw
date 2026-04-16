'use client';

import { useState, useCallback, useRef } from 'react';
import { FileText, Download, Printer, Loader2, X } from 'lucide-react';
import { CaseHubDocumentTimeline } from '@/components/case-hub-document-timeline';
import { generateBankruptcyDoc } from '@/lib/actions/bankruptcy-document-actions';
import { getGeneratedDocumentDownloadUrl } from '@/lib/actions/document-download-actions';
import type { BankruptcyDocumentType } from '@/lib/bankruptcy/document-generator';
import type { CaseHubDocuments } from '@/lib/queries/case-hub-projection';

interface BankruptcyDocumentsTabProps {
  caseId: string;
  organizationId: string;
  /** case-hub-projection.documents — 이미 등록된 문서 타임라인. */
  hubDocuments?: CaseHubDocuments | null;
}

const DOCUMENT_TYPES: {
  key: BankruptcyDocumentType;
  label: string;
  description: string;
}[] = [
  { key: 'petition', label: '파산·면책 신청서', description: '법원 제출용 파산 및 면책 신청서' },
  { key: 'delegation', label: '위임장', description: '법무사/변호사 위임장' },
  { key: 'creditor_list', label: '채권자 목록', description: '채권자 현황 목록표' },
  { key: 'property_list', label: '재산 목록', description: '재산 현황 목록표' },
  { key: 'income_statement', label: '수입 및 지출에 관한 목록', description: '월 소득/지출 현황' },
  { key: 'affidavit', label: '진술서', description: '채무 경위 및 재산에 관한 진술서' },
];

export function BankruptcyDocumentsTab({
  caseId,
  organizationId,
  hubDocuments,
}: BankruptcyDocumentsTabProps) {
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handlePreview = useCallback(
    async (docType: BankruptcyDocumentType, label: string) => {
      setLoadingDoc(docType);
      setError(null);
      try {
        const result = await generateBankruptcyDoc(caseId, organizationId, docType);
        if (result.ok) {
          setPreviewHtml(result.html);
          setPreviewTitle(label);
        } else {
          setError(result.userMessage);
        }
      } catch {
        setError('문서 생성 중 오류가 발생했습니다.');
      } finally {
        setLoadingDoc(null);
      }
    },
    [caseId, organizationId],
  );

  const handleDownload = useCallback(
    async (docType: BankruptcyDocumentType, label: string) => {
      setLoadingDoc(`dl_${docType}`);
      setError(null);
      try {
        const result = await generateBankruptcyDoc(caseId, organizationId, docType);
        if (!result.ok) {
          setError(result.userMessage);
          return;
        }

        if (result.persisted === false) {
          setError(`${result.persistenceWarning} (사건 문서함에는 기록되지 않습니다)`);
        }

        // 저장된 case_documents 아티팩트에 대한 서명 URL을 먼저 시도
        if (result.persisted === true && result.documentId) {
          const signed = await getGeneratedDocumentDownloadUrl(result.documentId);
          if (signed.ok) {
            const a = document.createElement('a');
            a.href = signed.url;
            a.download = `${label}.html`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => a.remove(), 100);
            return;
          }
        }

        // 저장 실패 / URL 발급 실패 시 Blob 폴백
        const blob = new Blob([result.html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${label}.html`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          a.remove();
          URL.revokeObjectURL(url);
        }, 100);
      } catch {
        setError('문서 다운로드 중 오류가 발생했습니다.');
      } finally {
        setLoadingDoc(null);
      }
    },
    [caseId, organizationId],
  );

  const handlePrint = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print();
    }
  }, []);

  const closePreview = useCallback(() => {
    setPreviewHtml(null);
    setPreviewTitle('');
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-700">
          채무자 정보와 채권자 데이터를 바탕으로 법원 제출용 파산·면책 서류를 생성합니다.
        </p>
        <p className="mt-1 text-xs text-blue-600">
          신청인 정보, 채권자 목록이 입력된 후 문서를 출력해주세요.
        </p>
      </div>

      {/* 이미 등록된 문서 타임라인 (case-hub-projection 단일 원천). */}
      {hubDocuments ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">기존 문서</h2>
          <CaseHubDocumentTimeline
            documents={hubDocuments}
            emptyDescription="아직 생성·등록된 문서가 없습니다. 아래에서 문서를 생성하면 여기에 누적됩니다."
            maxItems={8}
          />
        </section>
      ) : null}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-base font-semibold text-slate-800">출력 가능 문서</h2>
        <div className="space-y-3">
          {DOCUMENT_TYPES.map((doc) => {
            const isLoadingPreview = loadingDoc === doc.key;
            const isLoadingDownload = loadingDoc === `dl_${doc.key}`;
            return (
              <div
                key={doc.key}
                className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50/50 p-3"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-slate-400" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">{doc.label}</p>
                    <p className="text-xs text-slate-500">{doc.description}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
                    disabled={isLoadingPreview || isLoadingDownload}
                    onClick={() => handlePreview(doc.key, doc.label)}
                    aria-label={`${doc.label} 미리보기`}
                  >
                    {isLoadingPreview ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    미리보기
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-40"
                    disabled={isLoadingPreview || isLoadingDownload}
                    onClick={() => handleDownload(doc.key, doc.label)}
                    aria-label={`${doc.label} 다운로드`}
                  >
                    {isLoadingDownload ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    다운로드
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 미리보기 모달 */}
      {previewHtml && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label={`${previewTitle} 미리보기`}
        >
          <div className="relative flex h-[90vh] w-[90vw] max-w-5xl flex-col rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-800">{previewTitle}</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                  onClick={handlePrint}
                  aria-label="인쇄"
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                  인쇄
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  onClick={closePreview}
                  aria-label="닫기"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                ref={iframeRef}
                srcDoc={previewHtml}
                className="h-full w-full border-0"
                title={`${previewTitle} 미리보기`}
                sandbox="allow-same-origin allow-popups"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
