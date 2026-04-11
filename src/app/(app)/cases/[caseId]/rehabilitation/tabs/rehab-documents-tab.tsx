'use client';

import { useState, useCallback, useRef } from 'react';
import { FileText, Download, Printer, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/components/ui/toast-provider';
import { generateRehabDocument, upsertProhibitionOrder } from '@/lib/actions/rehabilitation-actions';
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

  // D5114 금지명령 신청서 폼
  const [showProhibitionForm, setShowProhibitionForm] = useState(false);
  const [savingProhibition, setSavingProhibition] = useState(false);
  const [prohibition, setProhibition] = useState<ProhibitionOrderForm>(() => {
    if (!prohibitionOrder) return INITIAL_PROHIBITION;
    return {
      court_name: (prohibitionOrder.court_name as string) || '',
      applicant_name: (prohibitionOrder.applicant_name as string) || '',
      resident_number_front: (prohibitionOrder.resident_number_front as string) || '',
      registered_address: (prohibitionOrder.registered_address as string) || '',
      current_address: (prohibitionOrder.current_address as string) || '',
      has_agent: (prohibitionOrder.has_agent as boolean) || false,
      agent_type: (prohibitionOrder.agent_type as '법무사' | '변호사' | '기타') || '변호사',
      agent_name: (prohibitionOrder.agent_name as string) || '',
      agent_phone: (prohibitionOrder.agent_phone as string) || '',
      agent_fax: (prohibitionOrder.agent_fax as string) || '',
      agent_address: (prohibitionOrder.agent_address as string) || '',
      agent_law_firm: (prohibitionOrder.agent_law_firm as string) || '',
      total_debt_amount: prohibitionOrder.total_debt_amount ? String(prohibitionOrder.total_debt_amount) : '',
      creditor_count: prohibitionOrder.creditor_count ? String(prohibitionOrder.creditor_count) : '',
      reason_detail: (prohibitionOrder.reason_detail as string) || '',
      attachments: (prohibitionOrder.attachments as string[]) || INITIAL_PROHIBITION.attachments,
      application_date: (prohibitionOrder.application_date as string) || INITIAL_PROHIBITION.application_date,
    };
  });

  const updateProhibition = useCallback(<K extends keyof ProhibitionOrderForm>(key: K, value: ProhibitionOrderForm[K]) => {
    setProhibition((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleAttachment = useCallback((att: string) => {
    setProhibition((prev) => ({
      ...prev,
      attachments: prev.attachments.includes(att)
        ? prev.attachments.filter((a) => a !== att)
        : [...prev.attachments, att],
    }));
  }, []);

  const handleSaveProhibition = useCallback(async () => {
    if (!prohibition.court_name || !prohibition.applicant_name) {
      toastError('입력 오류', { message: '법원명과 신청인 이름은 필수입니다.' });
      return;
    }
    setSavingProhibition(true);
    try {
      const result = await upsertProhibitionOrder(caseId, organizationId, {
        ...prohibition,
        total_debt_amount: parseInt(prohibition.total_debt_amount) || 0,
        creditor_count: parseInt(prohibition.creditor_count) || 0,
      });
      if (result.ok) {
        toastSuccess('저장 완료', { message: '금지명령 신청서가 저장되었습니다.' });
      } else {
        toastError('저장 실패', { message: result.userMessage || '금지명령 신청서 저장에 실패했습니다.' });
      }
    } finally {
      setSavingProhibition(false);
    }
  }, [caseId, organizationId, prohibition, toastSuccess, toastError]);

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

      {/* D5114 금지명령 신청서 폼 */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <button
          type="button"
          onClick={() => setShowProhibitionForm((v) => !v)}
          className="flex w-full items-center justify-between text-left"
          aria-expanded={showProhibitionForm}
          aria-controls="prohibition-form"
        >
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-500" />
            <div>
              <h2 className="text-base font-semibold text-slate-800">금지명령 신청서 (D5114)</h2>
              <p className="text-xs text-slate-500">강제집행 금지 신청 — 개시신청 시 함께 제출</p>
            </div>
          </div>
          {showProhibitionForm ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
        </button>

        {showProhibitionForm && (
          <div id="prohibition-form" className="mt-4 space-y-4">
            <p className="text-xs text-slate-500"><span className="text-red-500">*</span> 필수 입력 항목입니다</p>

            {/* 사건 정보 */}
            <div className="rounded-md bg-slate-50 p-3">
              <h3 className="mb-2 text-xs font-semibold text-slate-700">사건 정보</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <label htmlFor="proh-court" className="text-xs font-medium text-slate-600">
                    법원명 <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="proh-court"
                    type="text"
                    value={prohibition.court_name}
                    onChange={(e) => updateProhibition('court_name', e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="서울회생법원"
                    required
                    aria-required="true"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="proh-date" className="text-xs font-medium text-slate-600">신청일</label>
                  <input
                    id="proh-date"
                    type="date"
                    value={prohibition.application_date}
                    onChange={(e) => updateProhibition('application_date', e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 신청인(채무자) 정보 */}
            <div className="rounded-md bg-slate-50 p-3">
              <h3 className="mb-2 text-xs font-semibold text-slate-700">신청인(채무자) 정보</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <label htmlFor="proh-name" className="text-xs font-medium text-slate-600">
                    이름 <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="proh-name"
                    type="text"
                    value={prohibition.applicant_name}
                    onChange={(e) => updateProhibition('applicant_name', e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                    aria-required="true"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="proh-rrn" className="text-xs font-medium text-slate-600">주민등록번호 앞 6자리</label>
                  <input
                    id="proh-rrn"
                    type="text"
                    maxLength={6}
                    value={prohibition.resident_number_front}
                    onChange={(e) => updateProhibition('resident_number_front', e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="YYMMDD"
                  />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="proh-regaddr" className="text-xs font-medium text-slate-600">등록 기준지</label>
                  <input
                    id="proh-regaddr"
                    type="text"
                    value={prohibition.registered_address}
                    onChange={(e) => updateProhibition('registered_address', e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="proh-curaddr" className="text-xs font-medium text-slate-600">현재 주소</label>
                  <input
                    id="proh-curaddr"
                    type="text"
                    value={prohibition.current_address}
                    onChange={(e) => updateProhibition('current_address', e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 대리인 */}
            <div className="rounded-md bg-slate-50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-xs font-semibold text-slate-700">대리인 정보</h3>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prohibition.has_agent}
                    onChange={(e) => updateProhibition('has_agent', e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                    aria-label="대리인 있음"
                  />
                  대리인 있음
                </label>
              </div>
              {prohibition.has_agent && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <label htmlFor="proh-agtype" className="text-xs font-medium text-slate-600">대리인 유형</label>
                    <select
                      id="proh-agtype"
                      value={prohibition.agent_type}
                      onChange={(e) => updateProhibition('agent_type', e.target.value as '법무사' | '변호사' | '기타')}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="변호사">변호사</option>
                      <option value="법무사">법무사</option>
                      <option value="기타">기타</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="proh-agname" className="text-xs font-medium text-slate-600">대리인 이름</label>
                    <input
                      id="proh-agname"
                      type="text"
                      value={prohibition.agent_name}
                      onChange={(e) => updateProhibition('agent_name', e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  {prohibition.agent_type === '변호사' && (
                    <div className="space-y-1">
                      <label htmlFor="proh-agfirm" className="text-xs font-medium text-slate-600">법무법인</label>
                      <input
                        id="proh-agfirm"
                        type="text"
                        value={prohibition.agent_law_firm}
                        onChange={(e) => updateProhibition('agent_law_firm', e.target.value)}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label htmlFor="proh-agphone" className="text-xs font-medium text-slate-600">전화번호</label>
                    <input
                      id="proh-agphone"
                      type="tel"
                      value={prohibition.agent_phone}
                      onChange={(e) => updateProhibition('agent_phone', e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="02-000-0000"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="proh-agfax" className="text-xs font-medium text-slate-600">팩스</label>
                    <input
                      id="proh-agfax"
                      type="tel"
                      value={prohibition.agent_fax}
                      onChange={(e) => updateProhibition('agent_fax', e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label htmlFor="proh-agaddr" className="text-xs font-medium text-slate-600">대리인 주소</label>
                    <input
                      id="proh-agaddr"
                      type="text"
                      value={prohibition.agent_address}
                      onChange={(e) => updateProhibition('agent_address', e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 신청 내용 */}
            <div className="rounded-md bg-slate-50 p-3">
              <h3 className="mb-2 text-xs font-semibold text-slate-700">신청 내용</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="proh-debt" className="text-xs font-medium text-slate-600">총 채무액 (원)</label>
                  <input
                    id="proh-debt"
                    type="text"
                    value={prohibition.total_debt_amount}
                    onChange={(e) => updateProhibition('total_debt_amount', e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="proh-crcount" className="text-xs font-medium text-slate-600">채권자 수</label>
                  <input
                    id="proh-crcount"
                    type="number"
                    min={0}
                    value={prohibition.creditor_count}
                    onChange={(e) => updateProhibition('creditor_count', e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <label htmlFor="proh-reason" className="text-xs font-medium text-slate-600">금지명령 필요 사유</label>
                <textarea
                  id="proh-reason"
                  rows={3}
                  value={prohibition.reason_detail}
                  onChange={(e) => updateProhibition('reason_detail', e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="채권자의 강제집행 우려 및 변제계획 수행 불가능성 등을 기재하세요"
                />
              </div>
            </div>

            {/* 소명방법(첨부서류) */}
            <div className="rounded-md bg-slate-50 p-3">
              <h3 className="mb-2 text-xs font-semibold text-slate-700">소명방법 (첨부서류)</h3>
              <div className="flex flex-wrap gap-3">
                {ATTACHMENT_OPTIONS.map((att) => (
                  <label key={att} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prohibition.attachments.includes(att)}
                      onChange={() => toggleAttachment(att)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                      aria-label={att}
                    />
                    {att}
                  </label>
                ))}
              </div>
            </div>

            {/* 신청취지 미리보기 */}
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
              <h3 className="mb-1 text-xs font-semibold text-blue-700">신청취지</h3>
              <p className="text-sm text-blue-800">
                &ldquo;신청인에 대한 개인회생절차 개시결정 전까지, 신청인의 재산 및 이에 대한 강제집행·가압류·가처분을 금지한다&rdquo;라는 결정을 구합니다.
              </p>
            </div>

            {/* 저장 */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveProhibition}
                disabled={savingProhibition}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="금지명령 신청서 저장"
              >
                {savingProhibition ? '저장 중...' : '신청서 저장'}
              </button>
            </div>
          </div>
        )}
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
