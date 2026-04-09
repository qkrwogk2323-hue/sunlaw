'use client';

import { useState, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/toast-provider';
import { upsertRehabIncomeSettings } from '@/lib/actions/rehabilitation-actions';
import { minimumLivingCost, SUPPORTED_YEARS, calculateMonthlyAvailable, formatMoney, parseMoney } from '@/lib/rehabilitation';
import { Save } from 'lucide-react';

interface RehabIncomeTabProps {
  caseId: string;
  organizationId: string;
  incomeSettings: Record<string, unknown> | null;
  familyMembers: Record<string, unknown>[];
}

export function RehabIncomeTab({
  caseId,
  organizationId,
  incomeSettings,
  familyMembers,
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
    living_cost_rate:
      (incomeSettings?.living_cost_rate as number) ?? 60,
    living_cost_input:
      (incomeSettings?.living_cost as number) || 0,
    extra_living_cost: (incomeSettings?.extra_living_cost as number) || 0,
    child_support: (incomeSettings?.child_support as number) || 0,
    trustee_comm_rate: (incomeSettings?.trustee_comm_rate as number) || 0,
    dispose_amount: (incomeSettings?.dispose_amount as number) || 0,
  });

  const recommendedLivingCost = useMemo(
    () => minimumLivingCost(dependentCount, form.income_year, form.living_cost_rate),
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
        child_support: form.child_support,
        trustee_comm_rate: form.trustee_comm_rate,
        dispose_amount: form.dispose_amount,
        dependent_count: dependentCount,
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

  const householdTable = useMemo(
    () => SUPPORTED_YEARS.map((year) => ({
      year,
      values: [1, 2, 3, 4, 5, 6].map((size) => minimumLivingCost(size, year, form.living_cost_rate)),
    })),
    [form.living_cost_rate],
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
            <label htmlFor="dispose_amount" className="text-sm font-medium text-slate-700">처분재산 변제투입액 (원)</label>
            <input
              id="dispose_amount"
              type="text"
              value={form.dispose_amount ? formatMoney(form.dispose_amount) : ''}
              onChange={(e) => updateField('dispose_amount', parseMoney(e.target.value))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
        </div>
      </section>

      {/* 생계비 */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-1 text-base font-semibold text-slate-800">
          생계비 (기준중위소득 {form.living_cost_rate}%)
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          권장선 60%는 회생법원 표준이며, 사건별로 50~100% 조정 가능합니다. 권장선 미만 입력 시 소명서에 사유 기재 필요.
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
            <label htmlFor="living_cost_rate" className="text-sm font-medium text-slate-700">권장선 비율 (%)</label>
            <input
              id="living_cost_rate"
              type="number"
              min={1}
              max={100}
              step={1}
              value={form.living_cost_rate}
              onChange={(e) => updateField('living_cost_rate', Math.max(1, Math.min(100, parseInt(e.target.value) || 60)))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-right text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="권장선 비율"
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
            기준중위소득 {form.living_cost_rate}% 참고표 펼치기
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="extra_living_cost" className="text-sm font-medium text-slate-700">추가 생계비 (원)</label>
            <input
              id="extra_living_cost"
              type="text"
              value={form.extra_living_cost ? formatMoney(form.extra_living_cost) : ''}
              onChange={(e) => updateField('extra_living_cost', parseMoney(e.target.value))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="0"
            />
            <p className="text-xs text-slate-400">의료비, 교육비 등 법원 인정 추가 비용</p>
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
