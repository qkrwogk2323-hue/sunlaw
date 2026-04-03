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
import { Plus, Trash2, Save, Search, ChevronDown, ChevronUp } from 'lucide-react';

interface RehabCreditorsTabProps {
  caseId: string;
  organizationId: string;
  creditorSettings: Record<string, unknown> | null;
  creditors: Record<string, unknown>[];
  securedProperties: Record<string, unknown>[];
}

type CreditorForm = {
  id: string;
  bond_number: number;
  classify: string;
  creditor_name: string;
  branch_name: string;
  phone: string;
  capital: number;
  interest: number;
  delay_rate: number;
  bond_cause: string;
  is_secured: boolean;
  lien_type: string;
  max_claim_amount: number;
  isNew: boolean;
  expanded: boolean;
};

export function RehabCreditorsTab({
  caseId,
  organizationId,
  creditorSettings,
  creditors: initialCreditors,
  securedProperties: initialSecuredProperties,
}: RehabCreditorsTabProps) {
  const { success, error, undo } = useToast();
  const [saving, setSaving] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  // 채권자 설정
  const [settings, setSettings] = useState({
    base_date: (creditorSettings?.base_date as string) || '',
    delay_interest_rate: (creditorSettings?.delay_interest_rate as number) || 12,
  });

  // 채권자 목록
  const [creditors, setCreditors] = useState<CreditorForm[]>(
    initialCreditors.map((c) => ({
      id: c.id as string,
      bond_number: (c.bond_number as number) || 0,
      classify: (c.classify as string) || '법인',
      creditor_name: (c.creditor_name as string) || '',
      branch_name: (c.branch_name as string) || '',
      phone: (c.phone as string) || '',
      capital: (c.capital as number) || 0,
      interest: (c.interest as number) || 0,
      delay_rate: (c.delay_rate as number) || 0,
      bond_cause: (c.bond_cause as string) || '',
      is_secured: (c.is_secured as boolean) || false,
      lien_type: (c.lien_type as string) || '',
      max_claim_amount: (c.max_claim_amount as number) || 0,
      isNew: false,
      expanded: false,
    })),
  );

  // 금융기관 검색 결과
  const searchResults = useMemo(() => {
    if (!searchKeyword.trim()) return [];
    return searchFinancialInstitution(searchKeyword);
  }, [searchKeyword]);

  // 채무 합계
  const totals = useMemo(() => {
    const totalCapital = creditors.reduce((s, c) => s + c.capital, 0);
    const totalInterest = creditors.reduce((s, c) => s + c.interest, 0);
    const securedDebt = creditors.filter((c) => c.is_secured).reduce((s, c) => s + c.capital + c.interest, 0);
    const unsecuredDebt = totalCapital + totalInterest - securedDebt;
    return { totalCapital, totalInterest, totalDebt: totalCapital + totalInterest, securedDebt, unsecuredDebt };
  }, [creditors]);

  const addCreditor = useCallback(() => {
    const nextBondNumber = creditors.length > 0 ? Math.max(...creditors.map((c) => c.bond_number)) + 1 : 1;
    setCreditors((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        bond_number: nextBondNumber,
        classify: '법인',
        creditor_name: '',
        branch_name: '',
        phone: '',
        capital: 0,
        interest: 0,
        delay_rate: settings.delay_interest_rate,
        bond_cause: '',
        is_secured: false,
        lien_type: '',
        max_claim_amount: 0,
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
          id: `new-${Date.now()}`,
          bond_number: nextBondNumber,
          classify: fi.classify,
          creditor_name: fi.name,
          branch_name: '',
          phone: fi.phone,
          capital: 0,
          interest: 0,
          delay_rate: settings.delay_interest_rate,
          bond_cause: '',
          is_secured: false,
          lien_type: '',
          max_claim_amount: 0,
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
    },
    [creditors, caseId, organizationId, error, undo],
  );

  const toggleExpanded = useCallback((index: number) => {
    setCreditors((prev) =>
      prev.map((c, i) => (i === index ? { ...c, expanded: !c.expanded } : c)),
    );
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // 채권자 설정 저장
      const settingsResult = await upsertRehabCreditorSettings(caseId, organizationId, {
        base_date: settings.base_date || null,
        delay_interest_rate: settings.delay_interest_rate,
      });
      if (!settingsResult.ok) {
        error('저장 실패', { message: settingsResult.userMessage || '채권자 설정 저장에 실패했습니다.' });
        return;
      }

      // 채권자 목록 저장
      for (const c of creditors) {
        const data = {
          bond_number: c.bond_number,
          classify: c.classify,
          creditor_name: c.creditor_name,
          branch_name: c.branch_name,
          phone: c.phone,
          capital: c.capital,
          interest: c.interest,
          delay_rate: c.delay_rate,
          bond_cause: c.bond_cause,
          is_secured: c.is_secured,
          lien_type: c.lien_type,
          max_claim_amount: c.max_claim_amount,
        };
        const result = await upsertRehabCreditor(caseId, organizationId, data, c.isNew ? undefined : c.id);
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
      {/* 채무 요약 */}
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

      {/* 채권자 설정 */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-800">채권 기준 설정</h2>
        <div className="flex flex-wrap gap-4">
          <div className="space-y-1">
            <label htmlFor="base_date" className="text-sm font-medium text-slate-700">채권 기준일</label>
            <input
              id="base_date"
              type="date"
              value={settings.base_date}
              onChange={(e) => setSettings((prev) => ({ ...prev, base_date: e.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="delay_rate" className="text-sm font-medium text-slate-700">기본 지연이자율 (%)</label>
            <input
              id="delay_rate"
              type="number"
              step="0.1"
              min={0}
              max={100}
              value={settings.delay_interest_rate}
              onChange={(e) => setSettings((prev) => ({ ...prev, delay_interest_rate: parseFloat(e.target.value) || 0 }))}
              className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
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
            <div className="absolute z-10 mt-1 w-80 rounded-md border border-slate-200 bg-white shadow-lg">
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
            채권자 목록 ({creditors.length}건)
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
          <div className="py-8 text-center text-slate-400">
            <p className="font-medium">등록된 채권자가 없습니다</p>
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
                  </span>
                  <span className="text-xs text-slate-500">
                    원금 {formatMoney(c.capital)} / 이자 {formatMoney(c.interest)}
                  </span>
                  {c.is_secured && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">담보</span>
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
                    onClick={() => removeCreditor(idx)}
                    className="p-1 text-red-400 hover:text-red-600"
                    aria-label={`${c.creditor_name || '채권자'} 삭제`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* 상세 편집 */}
                {c.expanded && (
                  <div className="border-t border-slate-100 p-3">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                      <div className="space-y-1">
                        <label htmlFor={`cr-name-${idx}`} className="text-xs font-medium text-slate-600">채권자명</label>
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
                        <label htmlFor={`cr-cause-${idx}`} className="text-xs font-medium text-slate-600">채권 원인</label>
                        <input
                          id={`cr-cause-${idx}`}
                          type="text"
                          value={c.bond_cause}
                          onChange={(e) => updateCreditor(idx, 'bond_cause', e.target.value)}
                          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                          placeholder="대출, 카드 등"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor={`cr-capital-${idx}`} className="text-xs font-medium text-slate-600">원금 (원)</label>
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
                        <label htmlFor={`cr-drate-${idx}`} className="text-xs font-medium text-slate-600">지연이자율 (%)</label>
                        <input
                          id={`cr-drate-${idx}`}
                          type="number"
                          step="0.1"
                          min={0}
                          max={100}
                          value={c.delay_rate}
                          onChange={(e) => updateCreditor(idx, 'delay_rate', parseFloat(e.target.value) || 0)}
                          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div className="flex items-end gap-3">
                        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                          <input
                            type="checkbox"
                            checked={c.is_secured}
                            onChange={(e) => updateCreditor(idx, 'is_secured', e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                            aria-label="담보부 채권 여부"
                          />
                          담보부 채권
                        </label>
                      </div>
                    </div>

                    {/* 담보 정보 (is_secured일 때) */}
                    {c.is_secured && (
                      <div className="mt-3 grid grid-cols-2 gap-3 rounded-md bg-amber-50 p-3 md:grid-cols-3">
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
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

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
    </div>
  );
}
