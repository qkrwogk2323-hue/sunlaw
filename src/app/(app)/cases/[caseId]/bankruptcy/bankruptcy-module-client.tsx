'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-provider';
import { saveCreditorsFromExtraction, softDeleteCreditor } from '@/lib/actions/insolvency-actions';
import { RepaymentPlanCalculator } from './repayment-plan-calculator';
import { ClientActionPacketPanel } from './client-action-packet-panel';
import type { ExtractionResult } from '@/lib/insolvency-types';

type Creditor = {
  id: string;
  creditor_name: string;
  claim_class: 'secured' | 'priority' | 'general';
  principal_amount: number;
  interest_amount: number;
  penalty_amount: number;
  total_claim_amount: number;
  interest_rate_pct: number | null;
  has_guarantor: boolean;
  guarantor_name: string | null;
  ai_extracted: boolean;
  ai_confidence_score: number | null;
  is_confirmed: boolean;
  notes: string | null;
  source_page_reference: string | null;
};

type RepaymentPlan = {
  id: string;
  version_number: number;
  status: string;
  repayment_months: number;
  monthly_income: number;
  monthly_living_cost: number;
  monthly_disposable: number;
  total_claim_amount: number;
  total_repayment_amount: number | null;
  general_repayment_rate_pct: number | null;
  plan_start_date: string | null;
  plan_end_date: string | null;
};

type Collateral = {
  id: string;
  creditor_id: string;
  collateral_type: string;
  estimated_value: number | null;
  secured_claim_amount: number | null;
  real_estate_address: string | null;
  vehicle_model: string | null;
};

type RulesetConstant = {
  ruleset_key: string;
  display_name: string;
  value_amount: number | null;
  value_pct: number | null;
};

type ActionItem = {
  id: string;
  title: string;
  description: string | null;
  responsibility: 'client_self' | 'client_visit' | 'office_prepare';
  display_order: number;
  client_checked_at: string | null;
  staff_verified_at: string | null;
  is_completed: boolean;
  ai_extracted: boolean;
  client_note: string | null;
};

type ActionPacket = {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date: string | null;
  completed_count: number;
  total_count: number;
  created_at: string;
  items: ActionItem[];
};

interface Props {
  caseId: string;
  organizationId: string;
  caseTitle: string;
  insolvencySubtype: string | null;
  creditors: Creditor[];
  latestPlan: RepaymentPlan | null;
  memberRole: string;
  collaterals: Collateral[];
  rulesetConstants: RulesetConstant[];
  packets: ActionPacket[];
  correctionItemsFromAI: Array<{
    title: string;
    description: string | null;
    responsibility: 'client_self' | 'client_visit' | 'office_prepare';
  }>;
}

const CLAIM_CLASS_LABEL: Record<string, string> = {
  secured: '별제권부',
  priority: '우선변제',
  general: '일반채권'
};

const CLAIM_CLASS_COLOR: Record<string, string> = {
  secured: 'bg-orange-100 text-orange-700',
  priority: 'bg-purple-100 text-purple-700',
  general: 'bg-slate-100 text-slate-700'
};

const SUBTYPE_LABEL: Record<string, string> = {
  individual_rehabilitation: '개인회생',
  individual_bankruptcy: '개인파산',
  corporate_rehabilitation: '법인회생',
  corporate_bankruptcy: '법인파산'
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('ko-KR').format(n) + '원';
}

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  const color = pct >= 85 ? 'text-green-600' : pct >= 60 ? 'text-amber-600' : 'text-red-500';
  return <span className={`text-xs font-medium ${color}`}>AI {pct}%</span>;
}

export function BankruptcyModuleClient({ caseId, organizationId, caseTitle, insolvencySubtype, creditors: initialCreditors, latestPlan, memberRole, collaterals, rulesetConstants, packets, correctionItemsFromAI }: Props) {
  const { success, error: toastError, undo } = useToast();
  const [creditors, setCreditors] = useState<Creditor[]>(initialCreditors);
  const [uploading, setUploading] = useState(false);
  const [extractResult, setExtractResult] = useState<ExtractionResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'creditors' | 'calculator' | 'packets'>('creditors');
  const [docType, setDocType] = useState<string>('debt_certificate');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const secured = creditors.filter((c) => c.claim_class === 'secured');
  const priority = creditors.filter((c) => c.claim_class === 'priority');
  const general = creditors.filter((c) => c.claim_class === 'general');
  const totalClaim = creditors.reduce((s, c) => s + (c.total_claim_amount ?? 0), 0);

  const handleFileUpload = useCallback(async (file: File) => {
    setUploading(true);
    setExtractResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('caseId', caseId);
      formData.append('organizationId', organizationId);
      formData.append('documentType', docType);

      const res = await fetch('/api/bankruptcy/extract', { method: 'POST', body: formData });
      const json = await res.json();

      if (!json.ok) {
        toastError('문서 추출 실패', { message: json.feedback?.cause ?? '알 수 없는 오류' });
        return;
      }
      setExtractResult(json.result);
      success('추출 완료', { message: `${json.result.creditors.length}개 채권자 감지됨` });
    } catch (e) {
      toastError('네트워크 오류', { message: '파일 업로드 중 문제가 발생했습니다.' });
    } finally {
      setUploading(false);
    }
  }, [caseId, organizationId, docType, success, toastError]);

  const handleSaveExtracted = useCallback(async () => {
    if (!extractResult) return;
    setSaving(true);
    try {
      // jobId는 이미 서버에서 저장됨 — 최신 job id 조회
      const res = await fetch(`/api/bankruptcy/extract?caseId=${caseId}&organizationId=${organizationId}`);
      const latestJobId = res.ok ? (await res.json()).jobId : 'unknown';

      const result = await saveCreditorsFromExtraction({
        organizationId,
        caseId,
        jobId: latestJobId,
        creditors: extractResult.creditors
      });

      if (!result.ok) {
        toastError('저장 실패', { message: result.userMessage });
        return;
      }

      // optimistic update
      const newRows: Creditor[] = extractResult.creditors.map((c, idx) => ({
        id: `temp-${idx}`,
        creditor_name: c.creditorName,
        claim_class: c.claimClass,
        principal_amount: c.principalAmount,
        interest_amount: c.interestAmount,
        penalty_amount: c.penaltyAmount,
        total_claim_amount: c.principalAmount + c.interestAmount + c.penaltyAmount,
        interest_rate_pct: c.interestRatePct,
        has_guarantor: c.hasGuarantor,
        guarantor_name: c.guarantorName,
        ai_extracted: true,
        ai_confidence_score: c.aiConfidenceScore,
        is_confirmed: false,
        notes: null,
        source_page_reference: c.sourcePageReference
      }));

      setCreditors((prev) => [...prev, ...newRows]);
      setExtractResult(null);
      success('채권자 저장 완료', { message: `${newRows.length}건이 채권자목록에 추가됐습니다.` });
    } finally {
      setSaving(false);
    }
  }, [extractResult, caseId, organizationId, success, toastError]);

  const handleDelete = useCallback(async (creditorId: string, creditorName: string) => {
    const prev = creditors;
    setCreditors((c) => c.filter((r) => r.id !== creditorId));

    let undone = false;
    undo(
      `"${creditorName}" 삭제됨`,
      () => { undone = true; setCreditors(prev); }
    );

    // 8초 후 실제 soft delete (undo 토스트 기본 6초 후)
    setTimeout(async () => {
      if (undone) return;
      const result = await softDeleteCreditor(creditorId, organizationId, caseId);
      if (!result.ok) {
        setCreditors(prev);
        toastError('삭제 실패', { message: result.userMessage });
      }
    }, 6500);
  }, [creditors, caseId, organizationId, toastError, undo]);

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">도산 모듈</h1>
          <p className="mt-1 text-sm text-slate-500">
            {caseTitle} &nbsp;·&nbsp;
            {insolvencySubtype ? SUBTYPE_LABEL[insolvencySubtype] ?? insolvencySubtype : '유형 미지정'}
          </p>
        </div>
        {/* M07: CSV 내보내기 */}
        <a
          href={`/api/bankruptcy/export?caseId=${caseId}&organizationId=${organizationId}`}
          download
          aria-label="채권자목록 CSV 내보내기"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          CSV 내보내기
        </a>
      </div>

      {/* 요약 KPI */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: '총 채권액', value: formatCurrency(totalClaim), sub: `${creditors.length}건` },
          { label: '별제권부', value: formatCurrency(secured.reduce((s, c) => s + c.total_claim_amount, 0)), sub: `${secured.length}건` },
          { label: '우선변제', value: formatCurrency(priority.reduce((s, c) => s + c.total_claim_amount, 0)), sub: `${priority.length}건` },
          { label: '일반채권', value: formatCurrency(general.reduce((s, c) => s + c.total_claim_amount, 0)), sub: `${general.length}건` }
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs text-slate-500">{kpi.label}</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{kpi.value}</p>
            <p className="text-xs text-slate-400">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* 탭 내비게이션 */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1" role="tablist">
        {([
          { id: 'creditors', label: '채권자목록' },
          { id: 'calculator', label: '변제계획 계산기' },
          { id: 'packets', label: `액션패킷 ${packets.length > 0 ? `(${packets.length})` : ''}` }
        ] as const).map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'creditors' ? (
        <>
          {/* 문서 업로드 */}
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">📄 문서 업로드 · AI 추출</h2>
            <p className="mb-4 text-xs text-slate-500">
              <span className="text-red-500" aria-hidden="true">*</span> 필수 입력 항목입니다
            </p>

            <div className="flex flex-wrap gap-3">
              <div className="space-y-1">
                <label htmlFor="doc-type" className="text-xs font-medium text-slate-600">
                  문서 유형 <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <select
                  id="doc-type"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="debt_certificate">부채증명서</option>
                  <option value="correction_recommendation">보정권고서</option>
                  <option value="correction_order">보정명령서</option>
                  <option value="registration_abstract">등기부등본</option>
                  <option value="other">기타</option>
                </select>
              </div>

              <div className="flex items-end">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  aria-label="문서 파일 선택"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                    e.target.value = '';
                  }}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  aria-label="파일 업로드"
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  {uploading ? 'AI 분석 중...' : '파일 업로드'}
                </Button>
              </div>
            </div>

            <p className="mt-2 text-xs text-slate-400">PDF · JPG · PNG · WebP, 최대 20MB</p>

            {/* 추출 미리보기 */}
            {extractResult && (
              <div className="mt-4 rounded-lg bg-blue-50 p-4 ring-1 ring-blue-200">
                <div className="mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  <span className="text-sm font-medium text-blue-800">추출 완료 — {extractResult.creditors.length}개 채권자 감지</span>
                </div>
                <p className="mb-3 text-xs text-slate-600">{extractResult.rawSummary}</p>
                <div className="mb-3 max-h-48 overflow-y-auto">
                  <table className="w-full text-xs" aria-label="AI 추출 채권자 미리보기">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="pb-1 pr-3">채권자</th>
                        <th className="pb-1 pr-3">구분</th>
                        <th className="pb-1 pr-3 text-right">원금</th>
                        <th className="pb-1 text-right">합계</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extractResult.creditors.map((c, i) => (
                        <tr key={i} className="border-t border-blue-100">
                          <td className="py-1 pr-3 font-medium">{c.creditorName}</td>
                          <td className="py-1 pr-3">
                            <span className={`rounded px-1.5 py-0.5 text-xs ${CLAIM_CLASS_COLOR[c.claimClass]}`}>
                              {CLAIM_CLASS_LABEL[c.claimClass]}
                            </span>
                          </td>
                          <td className="py-1 pr-3 text-right">{formatCurrency(c.principalAmount)}</td>
                          <td className="py-1 text-right">{formatCurrency(c.principalAmount + c.interestAmount + c.penaltyAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveExtracted}
                    disabled={saving}
                    aria-label="채권자 목록에 저장"
                    className="text-sm"
                  >
                    {saving ? '저장 중...' : '채권자목록에 저장'}
                  </Button>
                  <Button
                    onClick={() => setExtractResult(null)}
                    aria-label="추출 결과 취소"
                    className="bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 text-sm"
                  >
                    취소
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 채권자목록 */}
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">📋 채권자목록 ({creditors.length}건)</h2>
            </div>

            {creditors.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <FileText className="mx-auto mb-3 h-8 w-8 opacity-40" aria-hidden="true" />
                <p className="font-medium">아직 채권자가 없습니다</p>
                <p className="mt-1 text-sm">위에서 문서를 업로드하면 AI가 자동으로 추출합니다</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="채권자목록">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                      <th className="pb-2 pr-3 font-medium">채권자</th>
                      <th className="pb-2 pr-3 font-medium">구분</th>
                      <th className="pb-2 pr-3 text-right font-medium">원금</th>
                      <th className="pb-2 pr-3 text-right font-medium">이자</th>
                      <th className="pb-2 pr-3 text-right font-medium">합계</th>
                      <th className="pb-2 pr-3 font-medium">상태</th>
                      <th className="pb-2 font-medium"><span className="sr-only">삭제</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditors.map((c) => (
                      <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-900">{c.creditor_name}</span>
                            {c.ai_extracted && <ConfidenceBadge score={c.ai_confidence_score} />}
                          </div>
                          {c.source_page_reference && (
                            <p className="text-xs text-slate-400">{c.source_page_reference}</p>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <span className={`rounded px-2 py-0.5 text-xs font-medium ${CLAIM_CLASS_COLOR[c.claim_class]}`}>
                            {CLAIM_CLASS_LABEL[c.claim_class]}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-right text-slate-700">{formatCurrency(c.principal_amount)}</td>
                        <td className="py-2 pr-3 text-right text-slate-500">{formatCurrency(c.interest_amount + c.penalty_amount)}</td>
                        <td className="py-2 pr-3 text-right font-medium text-slate-900">{formatCurrency(c.total_claim_amount)}</td>
                        <td className="py-2 pr-3">
                          {c.is_confirmed ? (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle className="h-3 w-3" aria-hidden="true" /> 확정
                            </span>
                          ) : c.ai_extracted ? (
                            <span className="flex items-center gap-1 text-xs text-amber-600">
                              <AlertTriangle className="h-3 w-3" aria-hidden="true" /> 검토필요
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">수동입력</span>
                          )}
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => handleDelete(c.id, c.creditor_name)}
                            aria-label={`${c.creditor_name} 삭제`}
                            className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50">
                      <td colSpan={2} className="py-2 pr-3 text-xs font-semibold text-slate-600">합계</td>
                      <td className="py-2 pr-3 text-right text-xs font-semibold">{formatCurrency(creditors.reduce((s, c) => s + c.principal_amount, 0))}</td>
                      <td className="py-2 pr-3 text-right text-xs font-semibold">{formatCurrency(creditors.reduce((s, c) => s + c.interest_amount + c.penalty_amount, 0))}</td>
                      <td className="py-2 pr-3 text-right text-xs font-bold text-slate-900">{formatCurrency(totalClaim)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* 변제계획 요약 (최근) */}
          {latestPlan && (
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">📊 변제계획 (v{latestPlan.version_number})</h2>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">{latestPlan.status === 'draft' ? '초안' : latestPlan.status}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-500">변제기간</p>
                  <p className="font-semibold">{latestPlan.repayment_months}개월</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">월 가처분소득</p>
                  <p className="font-semibold">{formatCurrency(latestPlan.monthly_disposable)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">총 채권액</p>
                  <p className="font-semibold">{formatCurrency(latestPlan.total_claim_amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">일반채권 변제율</p>
                  <p className="font-semibold">{latestPlan.general_repayment_rate_pct != null ? `${latestPlan.general_repayment_rate_pct.toFixed(2)}%` : '-'}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('calculator')}
                className="mt-3 text-xs text-blue-600 hover:underline"
              >
                변제계획 계산기로 이동 →
              </button>
            </div>
          )}
        </>
      ) : activeTab === 'calculator' ? (
        <RepaymentPlanCalculator
          caseId={caseId}
          organizationId={organizationId}
          insolvencySubtype={insolvencySubtype}
          creditors={creditors}
          collaterals={collaterals}
          rulesetConstants={rulesetConstants}
          latestPlan={latestPlan ? {
            monthly_income: latestPlan.monthly_income,
            monthly_living_cost: latestPlan.monthly_living_cost,
            repayment_months: latestPlan.repayment_months,
            plan_start_date: latestPlan.plan_start_date
          } : null}
        />
      ) : (
        <ClientActionPacketPanel
          caseId={caseId}
          organizationId={organizationId}
          packets={packets}
          correctionItemsFromAI={correctionItemsFromAI}
        />
      )}
    </div>
  );
}
