'use client';

import { useState, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/toast-provider';
import {
  upsertRehabCreditor,
  softDeleteRehabCreditor,
  upsertRehabCreditorSettings,
  upsertRehabSecuredProperty,
} from '@/lib/actions/rehabilitation-actions';
import { searchFinancialInstitution, formatMoney, parseMoney } from '@/lib/rehabilitation';
import { Plus, Trash2, Save, Search, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { DangerActionButton } from '@/components/ui/danger-action-button';

interface RehabCreditorsTabProps {
  caseId: string;
  organizationId: string;
  creditorSettings: Record<string, unknown> | null;
  creditors: Record<string, unknown>[];
  creditorsPagination: { total: number; page: number; pageSize: number; totalPages: number };
  creditorsSummary: Record<string, unknown>[];
  securedProperties: Record<string, unknown>[];
}

type CreditorForm = {
  id: string;
  bond_number: number;
  classify: string;
  creditor_name: string;
  branch_name: string;
  postal_code: string;
  address: string;
  phone: string;
  fax: string;
  mobile: string;
  capital: number;
  capital_compute: string;
  interest: number;
  interest_compute: string;
  delay_rate: number;
  bond_cause: string;
  bond_content: string;
  is_secured: boolean;
  secured_property_id: string;
  lien_priority: number;
  lien_type: string;
  max_claim_amount: number;
  has_priority_repay: boolean;
  is_unsettled: boolean;
  is_annuity_debt: boolean;
  apply_restructuring: boolean;
  unsettled_reason: string;
  unsettled_amount: number;
  unsettled_text: string;
  guarantor_name: string;
  guarantor_resident_hash: string;
  guarantor_amount: number;
  guarantor_text: string;
  isNew: boolean;
  expanded: boolean;
};

let _creditorSeq = 0;
function initCreditor(c: Record<string, unknown>): CreditorForm {
  return {
    id: (c.id as string) || `new-${++_creditorSeq}`,
    bond_number: (c.bond_number as number) || 0,
    classify: (c.classify as string) || '법인',
    creditor_name: (c.creditor_name as string) || '',
    branch_name: (c.branch_name as string) || '',
    postal_code: (c.postal_code as string) || '',
    address: (c.address as string) || '',
    phone: (c.phone as string) || '',
    fax: (c.fax as string) || '',
    mobile: (c.mobile as string) || '',
    capital: (c.capital as number) || 0,
    capital_compute: (c.capital_compute as string) || '',
    interest: (c.interest as number) || 0,
    interest_compute: (c.interest_compute as string) || '',
    delay_rate: (c.delay_rate as number) || 0,
    bond_cause: (c.bond_cause as string) || '',
    bond_content: (c.bond_content as string) || '',
    is_secured: (c.is_secured as boolean) || false,
    secured_property_id: (c.secured_property_id as string) || '',
    lien_priority: (c.lien_priority as number) || 0,
    lien_type: (c.lien_type as string) || '',
    max_claim_amount: (c.max_claim_amount as number) || 0,
    has_priority_repay: (c.has_priority_repay as boolean) || false,
    is_unsettled: (c.is_unsettled as boolean) || false,
    is_annuity_debt: (c.is_annuity_debt as boolean) || false,
    apply_restructuring: (c.apply_restructuring as boolean) || false,
    unsettled_reason: (c.unsettled_reason as string) || '',
    unsettled_amount: (c.unsettled_amount as number) || 0,
    unsettled_text: (c.unsettled_text as string) || '',
    guarantor_name: (c.guarantor_name as string) || '',
    guarantor_resident_hash: (c.guarantor_resident_hash as string) || '',
    guarantor_amount: (c.guarantor_amount as number) || 0,
    guarantor_text: (c.guarantor_text as string) || '',
    isNew: false,
    expanded: false,
  };
}

export function RehabCreditorsTab({
  caseId,
  organizationId,
  creditorSettings,
  creditors: initialCreditors,
  creditorsPagination,
  creditorsSummary,
  securedProperties: initialSecuredProperties,
}: RehabCreditorsTabProps) {
  const { success, error, undo } = useToast();
  const [saving, setSaving] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  // 채권자 설정 (전체)
  const [settings, setSettings] = useState({
    base_date: (creditorSettings?.base_date as string) || (creditorSettings?.list_date as string) || '',
    bond_date: (creditorSettings?.bond_date as string) || '',
    repay_type: (creditorSettings?.repay_type as string) || 'sequential',
    summary_table: (creditorSettings?.summary_table as boolean) || false,
    copy_with_evidence: (creditorSettings?.copy_with_evidence as boolean) || false,
    delay_interest_rate: (creditorSettings?.delay_interest_rate as number) || 12,
  });

  // 별제권 담보물건
  const [securedProperties] = useState(initialSecuredProperties);

  // 채권자 목록
  const [creditors, setCreditors] = useState<CreditorForm[]>(
    initialCreditors.map((c) => initCreditor(c)),
  );

  // 검색
  const searchResults = useMemo(() => {
    if (!searchKeyword.trim()) return [];
    return searchFinancialInstitution(searchKeyword);
  }, [searchKeyword]);

  // 합계 (전체 기준 — creditorsSummary 사용, 현재 페이지가 아닌 전건)
  const totals = useMemo(() => {
    const all = creditorsSummary;
    const totalCapital = all.reduce((s, c) => s + ((c.capital as number) || 0), 0);
    const totalInterest = all.reduce((s, c) => s + ((c.interest as number) || 0), 0);
    const securedDebt = all.filter((c) => c.is_secured).reduce((s, c) => s + ((c.capital as number) || 0) + ((c.interest as number) || 0), 0);
    const unsecuredDebt = totalCapital + totalInterest - securedDebt;
    return { totalCapital, totalInterest, totalDebt: totalCapital + totalInterest, securedDebt, unsecuredDebt, count: creditorsPagination.total };
  }, [creditorsSummary, creditorsPagination.total]);

  const addCreditor = useCallback(() => {
    const nextBondNumber = creditors.length > 0 ? Math.max(...creditors.map((c) => c.bond_number)) + 1 : 1;
    setCreditors((prev) => [
      ...prev,
      {
        ...initCreditor({}),
        id: `new-${++_creditorSeq}`,
        bond_number: nextBondNumber,
        delay_rate: settings.delay_interest_rate,
        isNew: true,
        expanded: true,
      },
    ]);
  }, [creditors, settings.delay_interest_rate]);

  const addFromSearch = useCallback(
    (fi: { name: string; phone: string; classify: string }) => {
      const nextBondNumber = creditors.length > 0 ? Math.max(...creditors.map((c) => c.bond_number)) + 1 : 1;
      setCreditors((prev) => [
        ...prev,
        {
          ...initCreditor({}),
          id: `new-${++_creditorSeq}`,
          bond_number: nextBondNumber,
          classify: fi.classify,
          creditor_name: fi.name,
          phone: fi.phone,
          delay_rate: settings.delay_interest_rate,
          isNew: true,
          expanded: true,
        },
      ]);
      setSearchKeyword('');
    },
    [creditors, settings.delay_interest_rate],
  );

  const updateCreditor = useCallback((index: number, field: string, value: unknown) => {
    setCreditors((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  }, []);

  const [deleteConfirm, setDeleteConfirm] = useState<{ index: number; name: string } | null>(null);

  const removeCreditor = useCallback(
    async (index: number) => {
      const creditor = creditors[index];
      if (!creditor.isNew) {
        const result = await softDeleteRehabCreditor(creditor.id, caseId, organizationId);
        if (!result.ok) {
          error('삭제 실패', { message: '채권자 삭제 중 문제가 발생했습니다.' });
          return;
        }
        undo(`${creditor.creditor_name || '채권자'} 삭제됨`, () => {}, {
          message: '보관함에서 복구할 수 있습니다.',
        });
      }
      setCreditors((prev) => prev.filter((_, i) => i !== index));
      setDeleteConfirm(null);
    },
    [creditors, caseId, organizationId, error, undo],
  );

  const requestDelete = useCallback((index: number) => {
    const creditor = creditors[index];
    if (creditor.isNew) {
      // 신규(미저장)는 확인 없이 즉시 제거
      setCreditors((prev) => prev.filter((_, i) => i !== index));
    } else {
      setDeleteConfirm({ index, name: creditor.creditor_name || `채권자 ${creditor.bond_number}번` });
    }
  }, [creditors]);

  const toggleExpanded = useCallback((index: number) => {
    setCreditors((prev) =>
      prev.map((c, i) => (i === index ? { ...c, expanded: !c.expanded } : c)),
    );
  }, []);

  // 채권내용 자동생성
  const generateBondContent = useCallback((c: CreditorForm) => {
    const parts: string[] = [];
    if (c.bond_cause) parts.push(c.bond_cause);
    if (c.capital) parts.push(`원금 ${formatMoney(c.capital)}원`);
    if (c.interest) parts.push(`이자 ${formatMoney(c.interest)}원`);
    if (c.delay_rate) parts.push(`지연이자율 연 ${c.delay_rate}%`);
    return parts.join(', ');
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // 채권자 설정
      const settingsResult = await upsertRehabCreditorSettings(caseId, organizationId, {
        base_date: settings.base_date || null,
        bond_date: settings.bond_date || null,
        repay_type: settings.repay_type,
        summary_table: settings.summary_table,
        copy_with_evidence: settings.copy_with_evidence,
      });
      if (!settingsResult.ok) {
        error('저장 실패', { message: settingsResult.userMessage || '채권자 설정 저장에 실패했습니다.' });
        return;
      }

      // 채권자 목록
      for (const c of creditors) {
        const { isNew, expanded, id: formId, ...data } = c;
        const result = await upsertRehabCreditor(caseId, organizationId, data, isNew ? undefined : formId);
        if (!result.ok) {
          error('저장 실패', { message: `채권자 ${c.creditor_name || c.bond_number}번 저장에 실패했습니다.` });
          return;
        }
      }

      success('저장 완료', { message: '채권자 목록이 저장되었습니다.' });
    } finally {
      setSaving(false);
    }
  }, [settings, creditors, caseId, organizationId, success, error]);

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500"><span className="text-red-500">*</span> 필수 입력 항목입니다</p>

      {/* 채무 요약 카드 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: '총 채무액', value: totals.totalDebt },
          { label: '원금 합계', value: totals.totalCapital },
          { label: '이자 합계', value: totals.totalInterest },
          { label: '담보부 채무', value: totals.securedDebt },
          { label: '무담보 채무', value: totals.unsecuredDebt },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-3 text-center">
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{formatMoney(item.value)}원</p>
          </div>
        ))}
      </div>

      {/* 자격 경고 */}
      {totals.securedDebt >= 1_500_000_000 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          담보부채무가 15억원 이상입니다. 개인회생 신청 대상이 아닐 수 있습니다.
        </div>
      )}
      {totals.unsecuredDebt >= 1_000_000_000 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          무담보부채무가 10억원 이상입니다. 개인회생 신청 대상이 아닐 수 있습니다.
        </div>
      )}

      {/* 채권자 설정 (확장) */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-800">채권 기준 설정</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <label htmlFor="base_date" className="text-sm font-medium text-slate-700">채권자목록 기준일</label>
            <input
              id="base_date"
              type="date"
              value={settings.base_date}
              onChange={(e) => setSettings((p) => ({ ...p, base_date: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="bond_date" className="text-sm font-medium text-slate-700">채권조사확정일</label>
            <input
              id="bond_date"
              type="date"
              value={settings.bond_date}
              onChange={(e) => setSettings((p) => ({ ...p, bond_date: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="repay_type" className="text-sm font-medium text-slate-700">변제방식</label>
            <select
              id="repay_type"
              value={settings.repay_type}
              onChange={(e) => setSettings((p) => ({ ...p, repay_type: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="변제방식 선택"
            >
              <option value="sequential">순차변제</option>
              <option value="combined">병합변제</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="delay_rate_default" className="text-sm font-medium text-slate-700">기본 지연이자율 (%)</label>
            <input
              id="delay_rate_default"
              type="number"
              step="0.1"
              min={0}
              max={100}
              value={settings.delay_interest_rate}
              onChange={(e) => setSettings((p) => ({ ...p, delay_interest_rate: parseFloat(e.target.value) || 0 }))}
              className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.summary_table}
              onChange={(e) => setSettings((p) => ({ ...p, summary_table: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
              aria-label="요약표 출력"
            />
            요약표 출력
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.copy_with_evidence}
              onChange={(e) => setSettings((p) => ({ ...p, copy_with_evidence: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
              aria-label="소명자료 사본 포함"
            />
            소명자료 사본 포함
          </label>
        </div>
      </section>

      {/* 금융기관 검색 */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-800">금융기관 검색</h2>
        <div className="relative">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="은행명, 카드사명 검색"
              aria-label="금융기관 검색"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-80 rounded-md border border-slate-200 bg-white shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((fi) => (
                <button
                  key={fi.name}
                  type="button"
                  onClick={() => addFromSearch(fi)}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm text-left hover:bg-blue-50 transition-colors"
                >
                  <span className="font-medium">{fi.name}</span>
                  <span className="text-xs text-slate-400">{fi.phone}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 채권자 목록 */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">
            채권자 목록 ({totals.count}건)
          </h2>
          <button
            type="button"
            onClick={addCreditor}
            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
            aria-label="채권자 추가"
          >
            <Plus className="h-4 w-4" />
            직접 추가
          </button>
        </div>

        {creditors.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Users className="mx-auto mb-3 h-8 w-8 opacity-40" />
            <p className="font-medium">아직 채권자가 없습니다</p>
            <p className="mt-1 text-sm">금융기관 검색 또는 직접 추가로 채권자를 등록해주세요</p>
          </div>
        ) : (
          <div className="space-y-2">
            {creditors.map((c, idx) => (
              <div key={c.id} className="rounded-md border border-slate-100 bg-slate-50/50">
                {/* 요약 행 */}
                <div className="flex items-center gap-3 px-3 py-2">
                  <span className="w-8 text-center text-xs font-medium text-slate-400">{c.bond_number}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                    {c.creditor_name || '(미입력)'}
                    {c.branch_name && <span className="ml-1 text-xs text-slate-400">({c.branch_name})</span>}
                  </span>
                  <span className="text-xs text-slate-500">
                    원금 {formatMoney(c.capital)} / 이자 {formatMoney(c.interest)}
                  </span>
                  {c.is_secured && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">담보</span>
                  )}
                  {c.guarantor_name && (
                    <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700">보증인</span>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleExpanded(idx)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                    aria-label={c.expanded ? '접기' : '펼치기'}
                  >
                    {c.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDelete(idx)}
                    className="p-1 text-red-400 hover:text-red-600"
                    aria-label={`${c.creditor_name || '채권자'} 삭제`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* 상세 편집 */}
                {c.expanded && (
                  <div className="border-t border-slate-100 p-3 space-y-4">
                    {/* 기본 정보 */}
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                      <div className="space-y-1">
                        <label htmlFor={`cr-name-${idx}`} className="text-xs font-medium text-slate-600">채권자명 <span className="text-red-500" aria-hidden="true">*</span></label>
                        <input
                          id={`cr-name-${idx}`}
                          type="text"
                          value={c.creditor_name}
                          onChange={(e) => updateCreditor(idx, 'creditor_name', e.target.value)}
                          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor={`cr-branch-${idx}`} className="text-xs font-medium text-slate-600">지점명</label>
                        <input
                          id={`cr-branch-${idx}`}
                          type="text"
                          value={c.branch_name}
                          onChange={(e) => updateCreditor(idx, 'branch_name', e.target.value)}
                          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor={`cr-classify-${idx}`} className="text-xs font-medium text-slate-600">분류</label>
                        <select
                          id={`cr-classify-${idx}`}
                          value={c.classify}
                          onChange={(e) => updateCreditor(idx, 'classify', e.target.value)}
                          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                        >
                          <option value="법인">법인</option>
                          <option value="자연인">자연인</option>
                          <option value="국가">국가</option>
                          <option value="지방자치단체">지방자치단체</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label htmlFor={`cr-phone-${idx}`} className="text-xs font-medium text-slate-600">전화번호</label>
                        <input
                          id={`cr-phone-${idx}`}
                          type="tel"
                          value={c.phone}
                          onChange={(e) => updateCreditor(idx, 'phone', e.target.value)}
                          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor={`cr-fax-${idx}`} className="text-xs font-medium text-slate-600">팩스</label>
                        <input
                          id={`cr-fax-${idx}`}
                          type="tel"
                          value={c.fax}
                          onChange={(e) => updateCreditor(idx, 'fax', e.target.value)}
                          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor={`cr-mobile-${idx}`} className="text-xs font-medium text-slate-600">휴대전화</label>
                        <input
                          id={`cr-mobile-${idx}`}
                          type="tel"
                          value={c.mobile}
                          onChange={(e) => updateCreditor(idx, 'mobile', e.target.value)}
                          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor={`cr-postal-${idx}`} className="text-xs font-medium text-slate-600">우편번호</label>
                        <input
                          id={`cr-postal-${idx}`}
                          type="text"
                          maxLength={5}
                          value={c.postal_code}
                          onChange={(e) => updateCreditor(idx, 'postal_code', e.target.value.replace(/[^0-9]/g, ''))}
                          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label htmlFor={`cr-addr-${idx}`} className="text-xs font-medium text-slate-600">주소</label>
                        <input
                          id={`cr-addr-${idx}`}
                          type="text"
                          value={c.address}
                          onChange={(e) => updateCreditor(idx, 'address', e.target.value)}
                          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                    </div>

                    {/* 채권 금액 */}
                    <div className="rounded-md bg-blue-50/50 p-3">
                      <h4 className="mb-2 text-xs font-semibold text-blue-700">채권 금액</h4>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div className="space-y-1">
                          <label htmlFor={`cr-cause-${idx}`} className="text-xs font-medium text-slate-600">채권 원인 <span className="text-red-500" aria-hidden="true">*</span></label>
                          <input
                            id={`cr-cause-${idx}`}
                            type="text"
                            value={c.bond_cause}
                            onChange={(e) => updateCreditor(idx, 'bond_cause', e.target.value)}
                            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                            placeholder="대출, 카드, 렌탈 등"
                          />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor={`cr-capital-${idx}`} className="text-xs font-medium text-slate-600">원금 (원) <span className="text-red-500" aria-hidden="true">*</span></label>
                          <input
                            id={`cr-capital-${idx}`}
                            type="text"
                            value={c.capital ? formatMoney(c.capital) : ''}
                            onChange={(e) => updateCreditor(idx, 'capital', parseMoney(e.target.value))}
                            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-right"
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor={`cr-capcomp-${idx}`} className="text-xs font-medium text-slate-600">원금 산출근거</label>
                          <input
                            id={`cr-capcomp-${idx}`}
                            type="text"
                            value={c.capital_compute}
                            onChange={(e) => updateCreditor(idx, 'capital_compute', e.target.value)}
                            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                            placeholder="채무증명서 기준"
                          />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor={`cr-interest-${idx}`} className="text-xs font-medium text-slate-600">이자 (원)</label>
                          <input
                            id={`cr-interest-${idx}`}
                            type="text"
                            value={c.interest ? formatMoney(c.interest) : ''}
                            onChange={(e) => updateCreditor(idx, 'interest', parseMoney(e.target.value))}
                            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-right"
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor={`cr-intcomp-${idx}`} className="text-xs font-medium text-slate-600">이자 산출근거</label>
                          <input
                            id={`cr-intcomp-${idx}`}
                            type="text"
                            value={c.interest_compute}
                            onChange={(e) => updateCreditor(idx, 'interest_compute', e.target.value)}
                            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                            placeholder="거래내역서 기준"
                          />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor={`cr-drate-${idx}`} className="text-xs font-medium text-slate-600">지연이자율 (%)</label>
                          <input
                            id={`cr-drate-${idx}`}
                            type="number"
                            step="0.01"
                            min={0}
                            max={100}
                            value={c.delay_rate}
                            onChange={(e) => updateCreditor(idx, 'delay_rate', parseFloat(e.target.value) || 0)}
                            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                          />
                        </div>
                      </div>
                      {/* 채권내용 자동생성 */}
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <label htmlFor={`cr-content-${idx}`} className="text-xs font-medium text-slate-600">채권내용</label>
                          <button
                            type="button"
                            onClick={() => updateCreditor(idx, 'bond_content', generateBondContent(c))}
                            className="rounded bg-slate-100 px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50 transition-colors"
                            aria-label="채권내용 자동생성"
                          >
                            자동 생성
                          </button>
                        </div>
                        <textarea
                          id={`cr-content-${idx}`}
                          rows={2}
                          value={c.bond_content}
                          onChange={(e) => updateCreditor(idx, 'bond_content', e.target.value)}
                          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                          placeholder="채권내용 요약 (출력문서에 사용됩니다)"
                        />
                      </div>
                    </div>

                    {/* 옵션 체크박스 */}
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={c.is_secured} onChange={(e) => updateCreditor(idx, 'is_secured', e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600" aria-label="담보부 채권" />
                        담보부 채권
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={c.has_priority_repay} onChange={(e) => updateCreditor(idx, 'has_priority_repay', e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600" aria-label="우선변제" />
                        우선변제
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={c.is_unsettled} onChange={(e) => updateCreditor(idx, 'is_unsettled', e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600" aria-label="미확정채권" />
                        미확정채권
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={c.is_annuity_debt} onChange={(e) => updateCreditor(idx, 'is_annuity_debt', e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600" aria-label="연금채무" />
                        연금채무
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={c.apply_restructuring} onChange={(e) => updateCreditor(idx, 'apply_restructuring', e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600" aria-label="채무조정 적용" />
                        채무조정 적용
                      </label>
                    </div>

                    {/* 담보 정보 (is_secured일 때) */}
                    {c.is_secured && (
                      <div className="rounded-md bg-amber-50 p-3 space-y-3">
                        <h4 className="text-xs font-semibold text-amber-700">별제권(담보) 정보</h4>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                          <div className="space-y-1">
                            <label htmlFor={`cr-lien-${idx}`} className="text-xs font-medium text-amber-700">담보 종류</label>
                            <select
                              id={`cr-lien-${idx}`}
                              value={c.lien_type}
                              onChange={(e) => updateCreditor(idx, 'lien_type', e.target.value)}
                              className="w-full rounded border border-amber-300 px-2 py-1.5 text-sm"
                            >
                              <option value="">선택</option>
                              <option value="근저당권">근저당권</option>
                              <option value="저당권">저당권</option>
                              <option value="질권">질권</option>
                              <option value="양도담보">양도담보</option>
                              <option value="가등기담보">가등기담보</option>
                              <option value="자동차저당">자동차저당</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label htmlFor={`cr-maxclaim-${idx}`} className="text-xs font-medium text-amber-700">채권최고액 (원)</label>
                            <input
                              id={`cr-maxclaim-${idx}`}
                              type="text"
                              value={c.max_claim_amount ? formatMoney(c.max_claim_amount) : ''}
                              onChange={(e) => updateCreditor(idx, 'max_claim_amount', parseMoney(e.target.value))}
                              className="w-full rounded border border-amber-300 px-2 py-1.5 text-sm text-right"
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-1">
                            <label htmlFor={`cr-lienpri-${idx}`} className="text-xs font-medium text-amber-700">담보 순위</label>
                            <input
                              id={`cr-lienpri-${idx}`}
                              type="number"
                              min={0}
                              value={c.lien_priority || ''}
                              onChange={(e) => updateCreditor(idx, 'lien_priority', parseInt(e.target.value) || 0)}
                              className="w-full rounded border border-amber-300 px-2 py-1.5 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label htmlFor={`cr-secprop-${idx}`} className="text-xs font-medium text-amber-700">담보물건 연결</label>
                            <select
                              id={`cr-secprop-${idx}`}
                              value={c.secured_property_id}
                              onChange={(e) => updateCreditor(idx, 'secured_property_id', e.target.value)}
                              className="w-full rounded border border-amber-300 px-2 py-1.5 text-sm"
                            >
                              <option value="">선택</option>
                              {securedProperties.map((sp) => (
                                <option key={sp.id as string} value={sp.id as string}>
                                  {(sp.description as string) || (sp.property_type as string)} — {formatMoney((sp.market_value as number) || 0)}원
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 미확정채권 정보 */}
                    {c.is_unsettled && (
                      <div className="rounded-md bg-orange-50 p-3">
                        <h4 className="mb-2 text-xs font-semibold text-orange-700">미확정채권 정보</h4>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                          <div className="space-y-1">
                            <label htmlFor={`cr-unsreason-${idx}`} className="text-xs font-medium text-orange-700">미확정 사유</label>
                            <input
                              id={`cr-unsreason-${idx}`}
                              type="text"
                              value={c.unsettled_reason}
                              onChange={(e) => updateCreditor(idx, 'unsettled_reason', e.target.value)}
                              className="w-full rounded border border-orange-300 px-2 py-1.5 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label htmlFor={`cr-unsamt-${idx}`} className="text-xs font-medium text-orange-700">미확정금액 (원)</label>
                            <input
                              id={`cr-unsamt-${idx}`}
                              type="text"
                              value={c.unsettled_amount ? formatMoney(c.unsettled_amount) : ''}
                              onChange={(e) => updateCreditor(idx, 'unsettled_amount', parseMoney(e.target.value))}
                              className="w-full rounded border border-orange-300 px-2 py-1.5 text-sm text-right"
                            />
                          </div>
                          <div className="space-y-1">
                            <label htmlFor={`cr-unstxt-${idx}`} className="text-xs font-medium text-orange-700">비고</label>
                            <input
                              id={`cr-unstxt-${idx}`}
                              type="text"
                              value={c.unsettled_text}
                              onChange={(e) => updateCreditor(idx, 'unsettled_text', e.target.value)}
                              className="w-full rounded border border-orange-300 px-2 py-1.5 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 보증인 정보 */}
                    <div className="rounded-md bg-purple-50/50 p-3">
                      <h4 className="mb-2 text-xs font-semibold text-purple-700">보증인 정보</h4>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div className="space-y-1">
                          <label htmlFor={`cr-gname-${idx}`} className="text-xs font-medium text-purple-600">보증인 이름</label>
                          <input
                            id={`cr-gname-${idx}`}
                            type="text"
                            value={c.guarantor_name}
                            onChange={(e) => updateCreditor(idx, 'guarantor_name', e.target.value)}
                            className="w-full rounded border border-purple-200 px-2 py-1.5 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor={`cr-gamt-${idx}`} className="text-xs font-medium text-purple-600">보증금액 (원)</label>
                          <input
                            id={`cr-gamt-${idx}`}
                            type="text"
                            value={c.guarantor_amount ? formatMoney(c.guarantor_amount) : ''}
                            onChange={(e) => updateCreditor(idx, 'guarantor_amount', parseMoney(e.target.value))}
                            className="w-full rounded border border-purple-200 px-2 py-1.5 text-sm text-right"
                          />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label htmlFor={`cr-gtxt-${idx}`} className="text-xs font-medium text-purple-600">보증 내용</label>
                          <input
                            id={`cr-gtxt-${idx}`}
                            type="text"
                            value={c.guarantor_text}
                            onChange={(e) => updateCreditor(idx, 'guarantor_text', e.target.value)}
                            className="w-full rounded border border-purple-200 px-2 py-1.5 text-sm"
                            placeholder="보증 종류, 관계 등"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 페이지네이션 */}
      {creditorsPagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <a
            href={`?creditorPage=${Math.max(1, creditorsPagination.page - 1)}`}
            className={`rounded-md border px-3 py-1.5 text-sm ${creditorsPagination.page <= 1 ? 'pointer-events-none border-slate-200 text-slate-300' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
            aria-label="이전 페이지"
            aria-disabled={creditorsPagination.page <= 1}
          >
            이전
          </a>
          <span className="text-sm text-slate-600">
            {creditorsPagination.page} / {creditorsPagination.totalPages} 페이지 (총 {creditorsPagination.total}건)
          </span>
          <a
            href={`?creditorPage=${Math.min(creditorsPagination.totalPages, creditorsPagination.page + 1)}`}
            className={`rounded-md border px-3 py-1.5 text-sm ${creditorsPagination.page >= creditorsPagination.totalPages ? 'pointer-events-none border-slate-200 text-slate-300' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
            aria-label="다음 페이지"
            aria-disabled={creditorsPagination.page >= creditorsPagination.totalPages}
          >
            다음
          </a>
        </div>
      )}

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="채권자 목록 저장"
        >
          <Save className="h-4 w-4" />
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>

      {/* 삭제 확인 모달 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="delete-confirm-title">
          <div className="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 id="delete-confirm-title" className="text-base font-semibold text-slate-800">삭제 확인</h3>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-medium text-red-600">{deleteConfirm.name}</span>을(를) 삭제하시겠습니까?
            </p>
            <p className="mt-1 text-xs text-slate-400">보관함에서 복구할 수 있습니다.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => removeCreditor(deleteConfirm.index)}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
