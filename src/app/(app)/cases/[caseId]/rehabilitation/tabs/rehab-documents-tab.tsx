'use client';

import { useState, useCallback, useRef } from 'react';
import { FileText, Download, Printer, Loader2, X } from 'lucide-react';
import { generateRehabDocument } from '@/lib/actions/rehabilitation-actions';
import type { DocumentType } from '@/lib/rehabilitation/document-generator';

interface RehabDocumentsTabProps {
  caseId: string;
  organizationId: string;
}

const DOCUMENT_TYPES: {
  key: DocumentType;
  label: string;
  description: string;
  group?: string;
}[] = [
  // ── 필수 신청 문서 ──
  { key: 'application', label: '개인회생 신청서', description: '법원 제출용 개시신청서', group: '필수 신청 문서' },
  { key: 'delegation', label: '위임장', description: '변호사/법무사 위임장' },
  { key: 'delegation_with_attorney', label: '위임장 + 담당변호사지정서', description: '법무법인 위임 시 (위임장+지정서 통합)' },
  { key: 'attorney_designation', label: '담당변호사지정서', description: '법무법인 소속 담당변호사 지정' },
  { key: 'prohibition_order', label: '금지명령신청서', description: '강제집행 금지 (개시신청 시 필수)', group: '보전 처분' },
  { key: 'stay_order', label: '중지명령신청서', description: '진행 중인 강제집행 중지 신청' },
  // ── 첨부 서류 ──
  { key: 'creditor_list', label: '채권자 목록', description: '채권자 현황 목록표', group: '첨부 서류' },
  { key: 'property_list', label: '재산 목록', description: '재산 및 청산가치 목록' },
  { key: 'income_statement', label: '수입 및 지출에 관한 목록', description: '월 소득/지출 현황' },
  { key: 'affidavit', label: '진술서', description: '채무 경위 진술서' },
  { key: 'repayment_plan', label: '변제계획안', description: '변제계획안 제출서' },
];

export function RehabDocumentsTab({
  caseId,
  organizationId,
}: RehabDocumentsTabProps) {
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handlePreview = useCallback(
    async (docType: DocumentType, label: string) => {
      setLoadingDoc(docType);
      setError(null);
      try {
        const result = await generateRehabDocument(caseId, organizationId, docType);
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
    async (docType: DocumentType, label: string) => {
      setLoadingDoc(`dl_${docType}`);
      setError(null);
      try {
        const result = await generateRehabDocument(caseId, organizationId, docType);
        if (result.ok) {
          const blob = new Blob([result.html], { type: 'text/html;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${label}.html`;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          // 비동기로 정리하여 parentNode null 방지
          setTimeout(() => {
            a.remove();
            URL.revokeObjectURL(url);
          }, 100);
        } else {
          setError(result.userMessage);
        }
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
          각 탭의 데이터를 바탕으로 법원 제출용 문서를 생성합니다.
        </p>
        <p className="mt-1 text-xs text-blue-600">
          모든 탭의 입력이 완료된 후 문서를 출력해주세요.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-base font-semibold text-slate-800">출력 가능 문서</h2>
        <div className="space-y-3">
          {DOCUMENT_TYPES.map((doc, idx) => {
            const isLoadingPreview = loadingDoc === doc.key;
            const isLoadingDownload = loadingDoc === `dl_${doc.key}`;
            // 그룹 헤더 표시
            const showGroupHeader = doc.group && (idx === 0 || DOCUMENT_TYPES[idx - 1].group !== doc.group);
            return (
              <div key={doc.key}>
                {showGroupHeader && (
                  <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 first:mt-0">
                    {doc.group}
                  </p>
                )}
              <div
                className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50/50 p-3"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-slate-400" />
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
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Printer className="h-3.5 w-3.5" />
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
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    다운로드
                  </button>
                </div>
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
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-800">{previewTitle}</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                  onClick={handlePrint}
                  aria-label="인쇄"
                >
                  <Printer className="h-3.5 w-3.5" />
                  인쇄
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  onClick={closePreview}
                  aria-label="닫기"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            {/* iframe 미리보기 */}
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
