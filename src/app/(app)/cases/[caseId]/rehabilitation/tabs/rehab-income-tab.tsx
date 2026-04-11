'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useToast } from '@/components/ui/toast-provider';
import { upsertRehabIncomeSettings } from '@/lib/actions/rehabilitation-actions';
import { minimumLivingCost, computeLivingCost, SUPPORTED_YEARS, calculateMonthlyAvailable, calculateLiquidationValue, formatMoney, parseMoney, computeAnnualAmount } from '@/lib/rehabilitation';
import type { RehabPropertyItem } from '@/lib/rehabilitation';
import { Save, Plus, Trash2 } from 'lucide-react';

interface RehabIncomeTabProps {
  caseId: string;
  organizationId: string;
  incomeSettings: Record<string, unknown> | null;
  familyMembers: Record<string, unknown>[];
  properties?: Record<string, unknown>[];
  propertyDeductions?: Record<string, unknown>[];
}

export function RehabIncomeTab({
  caseId,
  organizationId,
  incomeSettings,
  familyMembers,
  properties: rawProperties = [],
  propertyDeductions: rawDeductions = [],
}: RehabIncomeTabProps) {
  const { success, error } = useToast();
  const [saving, setSaving] = useState(false);

  const dependentCount = familyMembers.filter((m) => m.is_dependent).length + 1;

  // DB → form 매핑 (DB는 median_income_year/net_salary, form은 income_year/monthly_income)
  const [form, setForm] = useState({
    income_year:
      (incomeSettings?.median_income_year as number) ||
      (incomeSettings?.income_year as number) ||
      new Date().getFullYear(),
    monthly_income:
      (incomeSettings?.net_salary as number) ||
      (incomeSettings?.monthly_income as number) ||
      0,
    // colaw 의미론: rate=100 → baseline60 그대로 사용 (= 기준중위소득의 60%).
    // rate=150 → baseline60 × 1.5 = 기준중위소득의 90%. (DB default 100, 0089 origin)
    living_cost_rate:
      (incomeSettings?.living_cost_rate as number) ?? 100,
    living_cost_input:
      (incomeSettings?.living_cost as number) || 0,
    extra_living_cost: (incomeSettings?.extra_living_cost as number) || 0,
    child_support: (incomeSettings?.child_support as number) || 0,
    trustee_comm_rate: (incomeSettings?.trustee_comm_rate as number) || 0,
    dispose_amount: (incomeSettings?.dispose_amount as number) || 0,
  });

  // 추가생계비 항목별 (§3-3a: 주거비, 교육비, 의료비, 기타)
  type LivingCostItem = { category: string; amount: number; reason: string };
  const [additionalLivingCosts, setAdditionalLivingCosts] = useState<LivingCostItem[]>(
    (Array.isArray(incomeSettings?.additional_living_costs) ? incomeSettings.additional_living_costs : []) as LivingCostItem[],
  );

  // 처분재산 항목별
  type DisposeItem = { category: string; amount: number; description: string };
  const [disposeItems, setDisposeItems] = useState<DisposeItem[]>(
    (Array.isArray(incomeSettings?.dispose_items) ? incomeSettings.dispose_items : []) as DisposeItem[],
  );

  // 항목별 합계 → 단일 필드 동기화
  useEffect(() => {
    if (additionalLivingCosts.length > 0) {
      const total = additionalLivingCosts.reduce((s, i) => s + (i.amount || 0), 0);
      setForm((prev) => ({ ...prev, extra_living_cost: total }));
    } else {
      setForm((prev) => ({ ...prev, extra_living_cost: 0 }));
    }
  }, [additionalLivingCosts]);

  useEffect(() => {
    if (disposeItems.length > 0) {
      const total = disposeItems.reduce((s, i) => s + (i.amount || 0), 0);
      setForm((prev) => ({ ...prev, dispose_amount: total }));
    } else {
      setForm((prev) => ({ ...prev, dispose_amount: 0 }));
    }
  }, [disposeItems]);

  // D5103 수입 명목별 breakdown
  type IncomeRow = { label: string; period_type: '월' | '분기' | '반기' | '연'; amount: number; annual_amount: number; has_seizure: boolean };
  const [incomeBreakdown, setIncomeBreakdown] = useState<IncomeRow[]>(
    ((incomeSettings?.income_breakdown as IncomeRow[]) || []).length > 0
      ? (incomeSettings?.income_breakdown as IncomeRow[])
      : [{ label: '급여', period_type: '월', amount: form.monthly_income, annual_amount: form.monthly_income * 12, has_seizure: false }]
  );

  // D5103 지출 항목별 breakdown (60% 초과 시)
  type ExpenseRow = { category: string; amount: number; additional_reason: string };
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseRow[]>(
    ((incomeSettings?.expense_breakdown as ExpenseRow[]) || [])
  );

  // colaw 의미론: 권장 생계비 = baseline60(=기준중위소득×60%) × rate/100
  // rate=100이면 baseline60 그대로 (= 기준중위소득의 60%, 회생법원 표준)
  const recommendedLivingCost = useMemo(
    () => computeLivingCost({
      householdSize: dependentCount,
      year: form.income_year,
      rate: form.living_cost_rate,
    }).afterRate,
    [form.income_year, dependentCount, form.living_cost_rate],
  );

  // 생계비 입력값 — 0이면 권장선 자동 적용, 사용자 입력 시 그 값 보존
  const livingCost = form.living_cost_input > 0 ? form.living_cost_input : recommendedLivingCost;
  const belowRecommendedFloor = form.living_cost_input > 0 && form.living_cost_input < recommendedLivingCost;

  const monthlyAvailable = useMemo(
    () =>
      calculateMonthlyAvailable(
        form.monthly_income,
        livingCost,
        form.extra_living_cost,
        form.child_support,
        form.trustee_comm_rate,
      ),
    [form.monthly_income, livingCost, form.extra_living_cost, form.child_support, form.trustee_comm_rate],
  );

  // 청산가치 — 재산목록에서 자동 계산 (변제계획 탭과 동일 파이프라인)
  const liquidationValue = useMemo(() => {
    if (rawProperties.length === 0) return 0;
    const propertyItems: RehabPropertyItem[] = rawProperties.map((p) => ({
      id: (p.id as string) || '',
      category: (p.category as string) || 'cash',
      detail: (p.detail as string) || '',
      amount: (p.amount as number) || 0,
      seizure: (p.seizure as string) || '',
      repayUse: (p.repay_use as string) || '',
      isProtection: (p.is_protection as boolean) || false,
    }));
    const deductionMap = Object.fromEntries(
      rawDeductions.map((d) => [d.category as string, d.deduction_amount as number]),
    );
    return calculateLiquidationValue(propertyItems, deductionMap).total;
  }, [rawProperties, rawDeductions]);

  const updateField = useCallback((field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (form.monthly_income <= 0) {
      error('입력 오류', { message: '월 소득을 입력해주세요.' });
      return;
    }
    setSaving(true);
    try {
      const result = await upsertRehabIncomeSettings(caseId, organizationId, {
        income_year: form.income_year,
        monthly_income: form.monthly_income,
        living_cost: livingCost,
        living_cost_rate: form.living_cost_rate,
        extra_living_cost: form.extra_living_cost,
        additional_living_costs: additionalLivingCosts,
        child_support: form.child_support,
        trustee_comm_rate: form.trustee_comm_rate,
        dispose_amount: form.dispose_amount,
        dispose_items: disposeItems,
        dependent_count: dependentCount,
        income_breakdown: incomeBreakdown,
        expense_breakdown: expenseBreakdown,
      });
      if (!result.ok) {
        error('저장 실패', { message: result.userMessage || '소득 설정 저장에 실패했습니다.' });
        return;
      }
      success('저장 완료', { message: '소득/생계비 설정이 저장되었습니다.' });
    } finally {
      setSaving(false);
    }
  }, [form, livingCost, dependentCount, caseId, organizationId, success, error]);

  // 참고표는 기준중위소득 60% (baseline60) 고정 — rate 적용 전 표준값
  const householdTable = useMemo(
    () => SUPPORTED_YEARS.map((year) => ({
      year,
      values: [1, 2, 3, 4, 5, 6].map((size) => minimumLivingCost(size, year)),
    })),
    [],
  );

  return (
    <div className="space-y-6">
      {/* 월 가용소득 요약 */}
      <div className={`rounded-lg border p-4 text-center ${monthlyAvailable > 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <p className={`text-sm ${monthlyAvailable > 0 ? 'text-green-600' : 'text-red-600'}`}>월 가용소득 (변제 가능액)</p>
        <p className={`mt-1 text-2xl font-bold ${monthlyAvailable > 0 ? 'text-green-800' : 'text-red-800'}`}>
          {formatMoney(monthlyAvailable)}원
        </p>
        {monthlyAvailable <= 0 && (
          <p className="mt-1 text-xs text-red-600">월 소득이 생계비보다 적어 변제가 어렵습니다</p>
        )}
      </div>

      {/* 청산가치 요약 — 재산 탭 데이터 자동 연동 */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">청산가치 (재산목록 합계)</p>
            <p className="mt-1 text-lg font-bold text-slate-800">{formatMoney(liquidationValue)}원</p>
          </div>
          {liquidationValue === 0 && rawProperties.length === 0 && (
            <p className="text-xs text-amber-600">재산 탭에서 재산을 먼저 등록해주세요</p>
          )}
          {liquidationValue === 0 && rawProperties.length > 0 && (
            <p className="text-xs text-amber-600">재산이 등록되어 있으나 청산가치가 0원입니다. 금액을 확인해주세요.</p>
          )}
        </div>
        {monthlyAvailable > 0 && liquidationValue > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            36개월 총 변제 예정액: {formatMoney(monthlyAvailable * 36)}원
            {monthlyAvailable * 36 < liquidationValue
              ? ' — 청산가치보장 미달, 재산처분 투입 또는 변제기간 연장 필요'
              : ' — 청산가치보장 충족'}
          </p>
        )}
      </div>

      {/* 소득 입력 */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-base font-semibold text-slate-800">월 소득</h2>
        <p className="mb-3 text-xs text-slate-500">
          <span className="text-red-500">*</span> 필수 입력 항목입니다
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="monthly_income" className="text-sm font-medium text-slate-700">
              월 소득 (원) <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="monthly_income"
              type="text"
              required
              aria-required="true"
              value={form.monthly_income ? formatMoney(form.monthly_income) : ''}
              onChange={(e) => updateField('monthly_income', parseMoney(e.target.value))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="dispose_amount" className="text-sm font-medium text-slate-700">처분재산 변제투입액 합계 (원)</label>
            <input
              id="dispose_amount"
              type="text"
              value={form.dispose_amount ? formatMoney(form.dispose_amount) : ''}
              onChange={(e) => updateField('dispose_amount', parseMoney(e.target.value))}
              readOnly={disposeItems.length > 0}
              className={`w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${disposeItems.length > 0 ? 'bg-slate-50 text-slate-500' : ''}`}
              placeholder="0"
            />
            {disposeItems.length > 0 && (
              <p className="text-xs text-slate-400">항목별 합계 자동 반영</p>
            )}
          </div>
        </div>

        {/* 처분재산 항목별 입력 */}
        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-blue-700">처분재산 항목별</h3>
            <button
              type="button"
              onClick={() => setDisposeItems((prev) => [...prev, { category: '부동산', amount: 0, description: '' }])}
              className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-200"
              aria-label="처분재산 항목 추가"
            >
              + 항목 추가
            </button>
          </div>
          {disposeItems.length === 0 ? (
            <p className="text-xs text-blue-600">처분할 재산이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {disposeItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={item.category}
                    onChange={(e) => setDisposeItems((prev) => prev.map((v, i) => i === idx ? { ...v, category: e.target.value } : v))}
                    className="w-24 rounded border border-blue-300 px-2 py-1 text-xs"
                    aria-label="처분재산 유형"
                  >
                    <option value="부동산">부동산</option>
                    <option value="차량">차량</option>
                    <option value="보증금">보증금</option>
                    <option value="보험해약금">보험해약금</option>
                    <option value="기타">기타</option>
                  </select>
                  <input
                    type="text"
                    value={item.amount ? formatMoney(item.amount) : ''}
                    onChange={(e) => setDisposeItems((prev) => prev.map((v, i) => i === idx ? { ...v, amount: parseMoney(e.target.value) } : v))}
                    className="w-28 rounded border border-blue-300 px-2 py-1 text-xs text-right"
                    placeholder="금액"
                    aria-label="처분재산 금액"
                  />
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => setDisposeItems((prev) => prev.map((v, i) => i === idx ? { ...v, description: e.target.value } : v))}
                    className="flex-1 rounded border border-blue-300 px-2 py-1 text-xs"
                    placeholder="설명 (소재, 면적 등)"
                    aria-label="처분재산 설명"
                  />
                  <button
                    type="button"
                    onClick={() => setDisposeItems((prev) => prev.filter((_, i) => i !== idx))}
                    className="rounded p-1 text-red-400 hover:text-red-600"
                    aria-label="항목 삭제"
                  >×</button>
                </div>
              ))}
              <div className="text-right text-xs font-medium text-blue-700">
                합계: {formatMoney(disposeItems.reduce((s, i) => s + (i.amount || 0), 0))}원
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 생계비 */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-1 text-base font-semibold text-slate-800">
          생계비 (기준중위소득 60% × 비율 {form.living_cost_rate}%)
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          기준중위소득 60%(회생법원 표준)에 비율을 곱해 권장선을 산출합니다. 비율 100% = 60% 그대로, 150% = 90%(가족 부양 등 추가 인정).
          권장선 미만 입력 시 소명서에 사유 기재 필요.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="space-y-1">
            <label htmlFor="income_year" className="text-sm font-medium text-slate-700">기준 연도</label>
            <select
              id="income_year"
              value={form.income_year}
              onChange={(e) => updateField('income_year', parseInt(e.target.value))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="기준 연도 선택"
            >
              {SUPPORTED_YEARS.map((y) => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-700">부양가족 수</p>
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {dependentCount}인 (본인 포함)
            </p>
          </div>
          <div className="space-y-1">
            <label htmlFor="living_cost_rate" className="text-sm font-medium text-slate-700">비율 (%)</label>
            <input
              id="living_cost_rate"
              type="number"
              min={1}
              max={300}
              step={1}
              value={form.living_cost_rate}
              onChange={(e) => updateField('living_cost_rate', Math.max(1, Math.min(300, parseInt(e.target.value) || 100)))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-right text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="기준중위소득 60% 대비 비율"
            />
            <p className="text-xs text-slate-400">권장선: {formatMoney(recommendedLivingCost)}원</p>
          </div>
          <div className="space-y-1">
            <label htmlFor="living_cost_input" className="text-sm font-medium text-slate-700">월 생계비 (원)</label>
            <input
              id="living_cost_input"
              type="text"
              value={form.living_cost_input ? formatMoney(form.living_cost_input) : ''}
              onChange={(e) => updateField('living_cost_input', parseMoney(e.target.value))}
              placeholder={formatMoney(recommendedLivingCost)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-right text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="월 생계비 직접 입력"
            />
            <p className="text-xs text-slate-400">비워두면 권장선 자동 적용</p>
          </div>
        </div>

        {belowRecommendedFloor && (
          <div className="mt-3 rounded-md border-l-4 border-yellow-400 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
            ⚠ 입력 생계비({formatMoney(form.living_cost_input)}원)가 권장선({formatMoney(recommendedLivingCost)}원) 미만입니다.
            법원 인정 사유를 소명서에 기재해야 합니다.
          </div>
        )}

        {/* 기준중위소득 참고표 */}
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
            기준중위소득 60% 참고표 펼치기 (비율 적용 전 표준값)
          </summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-2 py-1 text-left text-slate-500">연도</th>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <th key={n} className="px-2 py-1 text-right text-slate-500">{n}인</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {householdTable.map((row) => (
                  <tr key={row.year} className="border-b border-slate-100">
                    <td className="px-2 py-1 font-medium text-slate-600">{row.year}</td>
                    {row.values.map((v: number, i: number) => (
                      <td key={i} className="px-2 py-1 text-right text-slate-500">{formatMoney(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      {/* 추가 비용 */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-base font-semibold text-slate-800">추가 비용</h2>

        {/* 추가 생계비 항목별 입력 */}
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-amber-700">추가 생계비 항목별 (법원 승인 필요)</h3>
            <button
              type="button"
              onClick={() => setAdditionalLivingCosts((prev) => [...prev, { category: '주거비', amount: 0, reason: '' }])}
              className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 hover:bg-amber-200"
              aria-label="추가생계비 항목 추가"
            >
              + 항목 추가
            </button>
          </div>
          {additionalLivingCosts.length === 0 ? (
            <p className="text-xs text-amber-600">추가 생계비 항목이 없습니다. 기준중위소득 60% 초과 시 항목을 추가하세요.</p>
          ) : (
            <div className="space-y-2">
              {additionalLivingCosts.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={item.category}
                    onChange={(e) => setAdditionalLivingCosts((prev) => prev.map((v, i) => i === idx ? { ...v, category: e.target.value } : v))}
                    className="w-24 rounded border border-amber-300 px-2 py-1 text-xs"
                    aria-label="추가생계비 유형"
                  >
                    <option value="주거비">주거비</option>
                    <option value="교육비">교육비</option>
                    <option value="의료비">의료비</option>
                    <option value="기타">기타</option>
                  </select>
                  <input
                    type="text"
                    value={item.amount ? formatMoney(item.amount) : ''}
                    onChange={(e) => setAdditionalLivingCosts((prev) => prev.map((v, i) => i === idx ? { ...v, amount: parseMoney(e.target.value) } : v))}
                    className="w-28 rounded border border-amber-300 px-2 py-1 text-xs text-right"
                    placeholder="금액"
                    aria-label="추가생계비 금액"
                  />
                  <input
                    type="text"
                    value={item.reason}
                    onChange={(e) => setAdditionalLivingCosts((prev) => prev.map((v, i) => i === idx ? { ...v, reason: e.target.value } : v))}
                    className="flex-1 rounded border border-amber-300 px-2 py-1 text-xs"
                    placeholder="사유"
                    aria-label="추가생계비 사유"
                  />
                  <button
                    type="button"
                    onClick={() => setAdditionalLivingCosts((prev) => prev.filter((_, i) => i !== idx))}
                    className="rounded p-1 text-red-400 hover:text-red-600"
                    aria-label="항목 삭제"
                  >×</button>
                </div>
              ))}
              <div className="text-right text-xs font-medium text-amber-700">
                합계: {formatMoney(additionalLivingCosts.reduce((s, i) => s + (i.amount || 0), 0))}원
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="extra_living_cost" className="text-sm font-medium text-slate-700">추가 생계비 합계 (원)</label>
            <input
              id="extra_living_cost"
              type="text"
              value={form.extra_living_cost ? formatMoney(form.extra_living_cost) : ''}
              onChange={(e) => updateField('extra_living_cost', parseMoney(e.target.value))}
              readOnly={additionalLivingCosts.length > 0}
              className={`w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${additionalLivingCosts.length > 0 ? 'bg-slate-50 text-slate-500' : ''}`}
              placeholder="0"
            />
            {additionalLivingCosts.length > 0 && (
              <p className="text-xs text-slate-400">항목별 합계 자동 반영</p>
            )}
          </div>
          <div className="space-y-1">
            <label htmlFor="child_support" className="text-sm font-medium text-slate-700">양육비 (원)</label>
            <input
              id="child_support"
              type="text"
              value={form.child_support ? formatMoney(form.child_support) : ''}
              onChange={(e) => updateField('child_support', parseMoney(e.target.value))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="trustee_comm_rate" className="text-sm font-medium text-slate-700">회생위원 보수율 (%)</label>
            <input
              id="trustee_comm_rate"
              type="number"
              step="0.1"
              min={0}
              max={10}
              value={form.trustee_comm_rate}
              onChange={(e) => updateField('trustee_comm_rate', parseFloat(e.target.value) || 0)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400">일반적으로 3% 적용</p>
          </div>
        </div>
      </section>

      {/* 계산 내역 */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-800">월 가용소득 계산 내역</h2>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">월 소득</span>
            <span className="font-medium">{formatMoney(form.monthly_income)}원</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>(-) 생계비</span>
            <span>{formatMoney(livingCost)}원</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>(-) 추가 생계비</span>
            <span>{formatMoney(form.extra_living_cost)}원</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>(-) 양육비</span>
            <span>{formatMoney(form.child_support)}원</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>(-) 회생위원 보수 ({form.trustee_comm_rate}%)</span>
            <span>
              {formatMoney(
                Math.round(
                  (form.monthly_income - livingCost - form.extra_living_cost - form.child_support) *
                    (form.trustee_comm_rate / 100),
                ),
              )}
              원
            </span>
          </div>
          <div className="border-t border-slate-200 pt-1">
            <div className="flex justify-between font-semibold">
              <span className={monthlyAvailable > 0 ? 'text-green-700' : 'text-red-700'}>월 가용소득</span>
              <span className={monthlyAvailable > 0 ? 'text-green-700' : 'text-red-700'}>
                {formatMoney(monthlyAvailable)}원
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* D5103 I. 수입 명목별 상세 */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">수입 명목별 상세 (D5103)</h2>
          <button
            type="button"
            onClick={() => setIncomeBreakdown(prev => [...prev, { label: '', period_type: '월', amount: 0, annual_amount: 0, has_seizure: false }])}
            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
            aria-label="수입 항목 추가"
          >
            <Plus className="h-4 w-4" />
            추가
          </button>
        </div>
        {incomeBreakdown.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">수입 항목을 추가해주세요</p>
        ) : (
          <div className="space-y-2">
            {incomeBreakdown.map((row, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-2 rounded-md border border-slate-100 bg-slate-50/50 p-2 md:grid-cols-6">
                <div className="space-y-1">
                  <label htmlFor={`inc-label-${idx}`} className="text-xs font-medium text-slate-600">명목 <span className="text-red-500" aria-hidden="true">*</span></label>
                  <input
                    id={`inc-label-${idx}`}
                    type="text"
                    value={row.label}
                    onChange={(e) => setIncomeBreakdown(prev => prev.map((r, i) => i === idx ? { ...r, label: e.target.value } : r))}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    placeholder="급여, 상여, 연금 등"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`inc-period-${idx}`} className="text-xs font-medium text-slate-600">기간</label>
                  <select
                    id={`inc-period-${idx}`}
                    value={row.period_type}
                    onChange={(e) => {
                      const pt = e.target.value as '월' | '분기' | '반기' | '연';
                      setIncomeBreakdown(prev => prev.map((r, i) => i === idx ? { ...r, period_type: pt, annual_amount: computeAnnualAmount(pt, r.amount) } : r));
                    }}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  >
                    <option value="월">월</option>
                    <option value="분기">분기</option>
                    <option value="반기">반기</option>
                    <option value="연">연</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor={`inc-amt-${idx}`} className="text-xs font-medium text-slate-600">금액 (원) <span className="text-red-500" aria-hidden="true">*</span></label>
                  <input
                    id={`inc-amt-${idx}`}
                    type="text"
                    value={row.amount ? formatMoney(row.amount) : ''}
                    onChange={(e) => {
                      const amt = parseMoney(e.target.value);
                      setIncomeBreakdown(prev => prev.map((r, i) => i === idx ? { ...r, amount: amt, annual_amount: computeAnnualAmount(r.period_type, amt) } : r));
                    }}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-right"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`inc-annual-${idx}`} className="text-xs font-medium text-slate-600">연간환산</label>
                  <p id={`inc-annual-${idx}`} className="rounded border border-slate-200 bg-slate-100 px-2 py-1.5 text-sm text-right text-slate-600">
                    {formatMoney(row.annual_amount)}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <label className="flex items-center gap-1 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={row.has_seizure}
                      onChange={(e) => setIncomeBreakdown(prev => prev.map((r, i) => i === idx ? { ...r, has_seizure: e.target.checked } : r))}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                      aria-label="압류 유무"
                    />
                    압류
                  </label>
                </div>
                <div className="flex items-center justify-end pt-5">
                  <button type="button" onClick={() => setIncomeBreakdown(prev => prev.filter((_, i) => i !== idx))} className="p-1 text-red-400 hover:text-red-600" aria-label="수입 항목 삭제">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            <div className="mt-2 flex justify-between rounded-md bg-blue-50 px-3 py-2 text-sm">
              <span className="font-medium text-blue-700">월 평균 수입</span>
              <span className="font-semibold text-blue-800">
                {formatMoney(Math.ceil(incomeBreakdown.reduce((s, r) => s + r.annual_amount, 0) / 12))}원
              </span>
            </div>
          </div>
        )}
      </section>

      {/* D5103 II. 지출 항목별 (60% 초과 시) */}
      {form.living_cost_input > recommendedLivingCost && (
        <section className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-amber-800">지출 항목별 상세 (60% 초과)</h2>
              <p className="text-xs text-amber-600">생계비가 기준중위소득 60%를 초과합니다. 항목별 사유를 기재해주세요.</p>
            </div>
            <button
              type="button"
              onClick={() => setExpenseBreakdown(prev => [...prev, { category: '생계비', amount: 0, additional_reason: '' }])}
              className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-200 transition-colors"
              aria-label="지출 항목 추가"
            >
              <Plus className="h-4 w-4" />
              추가
            </button>
          </div>
          <div className="space-y-2">
            {expenseBreakdown.map((row, idx) => (
              <div key={idx} className="grid grid-cols-3 gap-2 rounded-md border border-amber-100 bg-white p-2 md:grid-cols-4">
                <div className="space-y-1">
                  <label htmlFor={`exp-cat-${idx}`} className="text-xs font-medium text-amber-700">비목 <span className="text-red-500" aria-hidden="true">*</span></label>
                  <select
                    id={`exp-cat-${idx}`}
                    value={row.category}
                    onChange={(e) => setExpenseBreakdown(prev => prev.map((r, i) => i === idx ? { ...r, category: e.target.value } : r))}
                    className="w-full rounded border border-amber-300 px-2 py-1.5 text-sm"
                  >
                    <option value="생계비">생계비</option>
                    <option value="주거비">주거비</option>
                    <option value="의료비">의료비</option>
                    <option value="교육비">교육비</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor={`exp-amt-${idx}`} className="text-xs font-medium text-amber-700">금액 (원) <span className="text-red-500" aria-hidden="true">*</span></label>
                  <input
                    id={`exp-amt-${idx}`}
                    type="text"
                    value={row.amount ? formatMoney(row.amount) : ''}
                    onChange={(e) => setExpenseBreakdown(prev => prev.map((r, i) => i === idx ? { ...r, amount: parseMoney(e.target.value) } : r))}
                    className="w-full rounded border border-amber-300 px-2 py-1.5 text-sm text-right"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label htmlFor={`exp-reason-${idx}`} className="text-xs font-medium text-amber-700">추가 지출 사유 <span className="text-red-500" aria-hidden="true">*</span></label>
                  <div className="flex gap-2">
                    <input
                      id={`exp-reason-${idx}`}
                      type="text"
                      value={row.additional_reason}
                      onChange={(e) => setExpenseBreakdown(prev => prev.map((r, i) => i === idx ? { ...r, additional_reason: e.target.value } : r))}
                      className="w-full rounded border border-amber-300 px-2 py-1.5 text-sm"
                      placeholder="구체적 사유 기재"
                    />
                    <button type="button" onClick={() => setExpenseBreakdown(prev => prev.filter((_, i) => i !== idx))} className="p-1 text-red-400 hover:text-red-600" aria-label="지출 항목 삭제">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 저장 */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="소득/생계비 저장"
        >
          <Save className="h-4 w-4" />
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  );
}
