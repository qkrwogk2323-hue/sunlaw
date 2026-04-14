'use client';

import { useState, useCallback, useRef } from 'react';
import { FileText, Download, Printer, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/components/ui/toast-provider';
import { PrintFrame } from '@/components/ui/print-frame';
import { generateRehabDocument, upsertProhibitionOrder } from '@/lib/actions/rehabilitation-actions';
import { getGeneratedDocumentDownloadUrl } from '@/lib/actions/document-download-actions';
import type { DocumentType } from '@/lib/rehabilitation/document-generator';

interface ProhibitionOrderForm {
  court_name: string;
  applicant_name: string;
  resident_number_front: string;
  registered_address: string;
  current_address: string;
  has_agent: boolean;
  agent_type: '법무사' | '변호사' | '기타';
  agent_name: string;
  agent_phone: string;
  agent_fax: string;
  agent_address: string;
  agent_law_firm: string;
  total_debt_amount: string;
  creditor_count: string;
  reason_detail: string;
  attachments: string[];
  application_date: string;
}

const INITIAL_PROHIBITION: ProhibitionOrderForm = {
  court_name: '',
  applicant_name: '',
  resident_number_front: '',
  registered_address: '',
  current_address: '',
  has_agent: false,
  agent_type: '변호사',
  agent_name: '',
  agent_phone: '',
  agent_fax: '',
  agent_address: '',
  agent_law_firm: '',
  total_debt_amount: '',
  creditor_count: '',
  reason_detail: '',
  attachments: ['개인회생신청서사본', '채권자목록', '재산목록', '수입지출목록'],
  application_date: new Date().toISOString().slice(0, 10),
};

const ATTACHMENT_OPTIONS = [
  '개인회생신청서사본',
  '채권자목록',
  '재산목록',
  '수입지출목록',
] as const;

interface RehabDocumentsTabProps {
  caseId: string;
  organizationId: string;
  prohibitionOrder?: Record<string, unknown> | null;
}

const DOCUMENT_TYPES: {
  key: DocumentType;
  label: string;
  description: string;
  group?: string;
}[] = [
  // ── 필수 신청 문서 ──
  { key: 'cover_page', label: '표지', description: '법원 제출용 표지', group: '필수 신청 문서' },
  { key: 'application', label: '개인회생 신청서', description: '법원 제출용 개시신청서' },
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
  { key: 'creditor_summary', label: '채권자목록 요약표', description: '총 채권액·담보/무담보 구분·채권자 수 요약' },
  { key: 'document_checklist', label: '자료제출목록', description: '법원 제출 서류 체크리스트 (별지서식)', group: '기타' },
];

/** 부속서류 체크박스 → DocumentType 매핑 */
const ATTACHMENT_DOC_MAP: { optKey: string; docType: DocumentType; label: string }[] = [
  { optKey: 'include_creditor_list', docType: 'creditor_list', label: '채권자 목록' },
  { optKey: 'include_property_list', docType: 'property_list', label: '재산 목록' },
  { optKey: 'include_income_statement', docType: 'income_statement', label: '수입·지출 목록' },
  { optKey: 'include_affidavit', docType: 'affidavit', label: '진술서' },
  { optKey: 'include_creditor_summary', docType: 'creditor_summary', label: '채권자목록 요약표' },
];

export function RehabDocumentsTab({
  caseId,
  organizationId,
  prohibitionOrder,
}: RehabDocumentsTabProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  // 부속서류 포함 옵션
  const [attachmentOptions, setAttachmentOptions] = useState({
    include_creditor_list: true,
    include_property_list: true,
    include_income_statement: true,
    include_affidavit: true,
    include_creditor_summary: false,
  });
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // D5114 금지명령 신청서 — 별도 폼 없음, 신청인 탭 데이터에서 자동 생성

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
        if (!result.ok) {
          setError(result.userMessage);
          return;
        }

        // 저장된 case_documents 아티팩트에 대한 서명 URL을 먼저 시도
        if (result.documentId) {
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

        // 저장 실패 / URL 발급 실패 시 Blob 폴백 — 즉시 다운로드는 보장
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

  // PrintFrame 상태
  const [printHtml, setPrintHtml] = useState<string | null>(null);

  const handlePrintPreview = useCallback(() => {
    if (previewHtml) {
      setPrintHtml(previewHtml);
    }
  }, [previewHtml]);

  const closePreview = useCallback(() => {
    setPreviewHtml(null);
    setPreviewTitle('');
  }, []);

  // 부속서류 전체출력
  const [batchProgress, setBatchProgress] = useState<string | null>(null);

  const handleBatchPrint = useCallback(async () => {
    const selected = ATTACHMENT_DOC_MAP.filter((m) => attachmentOptions[m.optKey as keyof typeof attachmentOptions]);
    if (selected.length === 0) {
      toastError('선택 오류', { message: '출력할 부속서류를 1개 이상 선택해주세요.' });
      return;
    }
    setError(null);
    const htmlParts: string[] = [];
    for (let i = 0; i < selected.length; i++) {
      const item = selected[i];
      setBatchProgress(`${i + 1}/${selected.length} 생성 중... (${item.label})`);
      try {
        const result = await generateRehabDocument(caseId, organizationId, item.docType);
        if (result.ok) {
          // 첫 문서 이후에는 page-break 삽입
          if (i > 0) htmlParts.push('<div class="page-break"></div>');
          htmlParts.push(result.html);
        } else {
          toastError(`${item.label} 생성 실패`, { message: result.userMessage });
        }
      } catch {
        toastError(`${item.label} 생성 오류`, { message: '문서 생성 중 오류가 발생했습니다.' });
      }
    }
    setBatchProgress(null);
    if (htmlParts.length > 0) {
      setPrintHtml(htmlParts.join('\n'));
    }
  }, [attachmentOptions, caseId, organizationId, toastError]);

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

      {/* 부속서류 포함 옵션 */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">부속서류 포함 옵션</h2>
        <p className="mb-3 text-xs text-slate-500">전체 출력 시 포함할 부속서류를 선택합니다.</p>
        <div className="flex flex-wrap gap-4">
          {([
            { key: 'include_creditor_list', label: '채권자 목록' },
            { key: 'include_property_list', label: '재산 목록' },
            { key: 'include_income_statement', label: '수입·지출 목록' },
            { key: 'include_affidavit', label: '진술서' },
            { key: 'include_creditor_summary', label: '채권자목록 요약표' },
          ] as const).map((opt) => (
            <label key={opt.key} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={attachmentOptions[opt.key]}
                onChange={(e) => setAttachmentOptions((prev) => ({ ...prev, [opt.key]: e.target.checked }))}
                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                aria-label={`${opt.label} 포함`}
              />
              {opt.label}
            </label>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            onClick={handleBatchPrint}
            disabled={!!batchProgress}
            aria-label="부속서류 전체출력"
          >
            <Printer className="h-4 w-4" />
            {batchProgress || '전체출력 (인쇄 / PDF 저장)'}
          </button>
          {batchProgress && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
        </div>
      </section>

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
                  onClick={handlePrintPreview}
                  aria-label="인쇄 / PDF 저장"
                >
                  <Printer className="h-3.5 w-3.5" />
                  인쇄 / PDF 저장
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
                sandbox="allow-same-origin allow-modals"
              />
            </div>
          </div>
        </div>
      )}

      {/* PrintFrame — 인쇄/PDF 출력 */}
      {printHtml && (
        <PrintFrame
          html={printHtml}
          onClose={() => setPrintHtml(null)}
        />
      )}
    </div>
  );
}
