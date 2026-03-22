'use client';

import { useState, useMemo } from 'react';
import { Calculator, Save, CheckCircle, AlertTriangle, TrendingUp, Home, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-provider';
import { saveRepaymentPlanFull } from '@/lib/actions/insolvency-actions';

// ─── Types ───────────────────────────────────────────────────────────────────

type Creditor = {
  id: string;
  creditor_name: string;
  claim_class: 'secured' | 'priority' | 'general';
  principal_amount: number;
  interest_amount: number;
  penalty_amount: number;
  total_claim_amount: number;
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

interface Props {
  caseId: string;
  organizationId: string;
  insolvencySubtype: string | null;
  creditors: Creditor[];
  collaterals: Collateral[];
  rulesetConstants: RulesetConstant[];
  latestPlan: {
    monthly_income: number;
    monthly_living_cost: number;
    repayment_months: number;
    plan_start_date: string | null;
  } | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return new Intl.NumberFormat('ko-KR').format(Math.round(n)) + '원';
}

function NumInput({
  label,
  id,
  value,
  onChange,
  hint,
  required
}: {
  label: string;
  id: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-slate-600">
        {label}{required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
      </label>
      <input
        id={id}
        type="number"
        min={0}
        value={value === 0 ? '' : value}
        placeholder="0"
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint && <p id={`${id}-hint`} className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RepaymentPlanCalculator({
  caseId,
  organizationId,
  insolvencySubtype,
  creditors,
  collaterals,
  rulesetConstants,
  latestPlan
}: Props) {
  const { success, error: toastError } = useToast();

  const defaultLivingCost =
    rulesetConstants.find((c) => c.ruleset_key === 'min_living_cost_2024')?.value_amount ?? 2228445;

  const [income, setIncome] = useState(latestPlan?.monthly_income ?? 0);
  const [livingCost, setLivingCost] = useState(latestPlan?.monthly_living_cost ?? defaultLivingCost);
  const [months, setMonths] = useState<36 | 60>(
    latestPlan?.repayment_months === 60 ? 60 : 36
  );
  const [startDate, setStartDate] = useState(
    latestPlan?.plan_start_date ?? new Date().toISOString().split('T')[0]
  );

  // M04: collateral estimated values (creditorId → amount)
  const [collateralValues, setCollateralValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    collaterals.forEach((c) => {
      if (c.estimated_value != null) {
        init[c.creditor_id] = (init[c.creditor_id] ?? 0) + c.estimated_value;
      }
    });
    return init;
  });

  const [saving, setSaving] = useState(false);

  const secured = creditors.filter((c) => c.claim_class === 'secured');
  const priority = creditors.filter((c) => c.claim_class === 'priority');
  const general = creditors.filter((c) => c.claim_class === 'general');

  // ─── Core Calculation ──────────────────────────────────────────────────────

  const calc = useMemo(() => {
    const disposable = Math.max(0, income - livingCost);
    const totalPool = disposable * months;

    // M04: 별제권부 — compare collateral value vs secured claim
    const securedDetails = secured.map((c) => {
      const collVal = collateralValues[c.id] ?? 0;
      const shortfall = Math.max(0, c.total_claim_amount - collVal);
      const surplus = Math.max(0, collVal - c.total_claim_amount);
      return { ...c, collVal, shortfall, surplus, isCovered: collVal >= c.total_claim_amount };
    });
    const securedShortfallTotal = securedDetails.reduce((sum, item) => sum + item.shortfall, 0);

    // M05: 우선변제채권 — must pay in full
    const totalPriority = priority.reduce((s, c) => s + c.total_claim_amount, 0);
    const priorityFeasible = totalPool >= totalPriority;

    // M06: 일반채권 안분비례
    const generalPool = Math.max(0, totalPool - totalPriority);
    const totalGeneralBase = general.reduce((s, c) => s + c.total_claim_amount, 0);
    const totalGeneralAdjusted = totalGeneralBase + securedShortfallTotal; // 별제 부족분 포함
    const generalRate = totalGeneralAdjusted > 0 ? Math.min(1, generalPool / totalGeneralAdjusted) : 0;
    const generalRatePct = generalRate * 100;

    // Allocation per creditor
    const allocations = [
      ...securedDetails.map((c) => ({
        creditorId: c.id,
        creditorName: c.creditor_name,
        claimClass: 'secured' as const,
        originalAmount: c.total_claim_amount,
        allocatedAmount: c.isCovered
          ? c.total_claim_amount
          : c.collVal + c.shortfall * generalRate,
        allocationRatePct: c.isCovered
          ? 100
          : ((c.collVal + c.shortfall * generalRate) / c.total_claim_amount) * 100
      })),
      ...priority.map((c) => ({
        creditorId: c.id,
        creditorName: c.creditor_name,
        claimClass: 'priority' as const,
        originalAmount: c.total_claim_amount,
        allocatedAmount: priorityFeasible ? c.total_claim_amount : c.total_claim_amount * (totalPool / Math.max(1, totalPriority)),
        allocationRatePct: priorityFeasible ? 100 : (totalPool / Math.max(1, totalPriority)) * 100
      })),
      ...general.map((c) => ({
        creditorId: c.id,
        creditorName: c.creditor_name,
        claimClass: 'general' as const,
        originalAmount: c.total_claim_amount,
        allocatedAmount: c.total_claim_amount * generalRate,
        allocationRatePct: generalRatePct
      }))
    ];

    const feasible = disposable > 0 && priorityFeasible;
    const totalRepayment = allocations.reduce((s, a) => s + a.allocatedAmount, 0);

    return {
      disposable,
      totalPool,
      totalPriority,
      priorityFeasible,
      generalPool,
      totalGeneralBase,
      totalGeneralAdjusted,
      generalRate,
      generalRatePct,
      securedDetails,
      securedShortfallTotal,
      allocations,
      feasible,
      totalSecured: secured.reduce((s, c) => s + c.total_claim_amount, 0),
      totalRepayment,
      monthlyPayment: totalPool > 0 ? totalPool / months : 0
    };
  }, [income, livingCost, months, secured, priority, general, collateralValues]);

  const handleSave = async () => {
    if (income <= 0) {
      toastError('입력 오류', { message: '월 수입을 입력해주세요.' });
      return;
    }
    setSaving(true);
    const result = await saveRepaymentPlanFull({
      organizationId,
      caseId,
      insolvencySubtype: insolvencySubtype ?? 'individual_rehabilitation',
      repaymentMonths: months,
      monthlyIncome: income,
      monthlyLivingCost: livingCost,
      planStartDate: startDate,
      totalSecuredClaim: calc.totalSecured,
      totalPriorityClaim: calc.totalPriority,
      totalGeneralClaim: general.reduce((s, c) => s + c.total_claim_amount, 0),
      totalRepaymentAmount: Math.round(calc.totalPool),
      generalRepaymentPool: Math.round(calc.generalPool),
      generalRepaymentRatePct: calc.generalRatePct,
      allocations: calc.allocations
    });
    setSaving(false);
    if (!result.ok) {
      toastError('저장 실패', { message: result.userMessage });
    } else {
      success('변제계획 저장 완료', { message: `v${result.versionNumber} 초안이 생성됐습니다.` });
    }
  };

  const canSave = creditors.length > 0 && income > 0;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <p className="text-xs text-slate-500">
        <span className="text-red-500">*</span> 필수 입력 항목입니다
      </p>

      {/* 기본 입력 */}
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="mb-4 flex items-center gap-2">
          <Calculator className="h-4 w-4 text-blue-600" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-700">변제계획 기초 입력</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <NumInput
            id="monthly-income"
            label="월 수입"
            value={income}
            onChange={setIncome}
            hint="단위: 원"
            required
          />
          <NumInput
            id="monthly-living-cost"
            label="월 최저생계비"
            value={livingCost}
            onChange={setLivingCost}
            hint={`기준: ${formatCurrency(defaultLivingCost)} (2024)`}
          />
          <div className="space-y-1">
            <label htmlFor="repayment-months" className="text-xs font-medium text-slate-600">
              변제기간 <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <select
              id="repayment-months"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value) as 36 | 60)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={36}>36개월 (3년)</option>
              <option value={60}>60개월 (5년)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="plan-start-date" className="text-xs font-medium text-slate-600">
              계획 시작일
            </label>
            <input
              id="plan-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 기초 계산 요약 */}
        {income > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {[
              { label: '월 가처분소득', value: formatCurrency(calc.disposable), ok: calc.disposable > 0 },
              { label: '총 변제재원', value: formatCurrency(calc.totalPool), ok: calc.totalPool > 0 },
              { label: '월 변제액', value: formatCurrency(calc.monthlyPayment), ok: calc.monthlyPayment > 0 }
            ].map((item) => (
              <div
                key={item.label}
                className={`rounded-lg px-4 py-2.5 text-sm ring-1 ${
                  item.ok ? 'bg-blue-50 text-blue-800 ring-blue-200' : 'bg-red-50 text-red-700 ring-red-200'
                }`}
              >
                <p className="text-xs opacity-70">{item.label}</p>
                <p className="font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* M04: 별제권부 채권 */}
      {secured.length > 0 && (
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex items-center gap-2">
            <Home className="h-4 w-4 text-orange-500" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-700">
              별제권부 채권 분석 (M04)
              <span className="ml-2 text-xs font-normal text-slate-400">담보가치 vs 피담보채권 비교</span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="별제권부 채권 분석">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="pb-2 pr-3 font-medium">채권자</th>
                  <th className="pb-2 pr-3 text-right font-medium">피담보채권</th>
                  <th className="pb-2 pr-3 font-medium">담보 추정가 (입력)</th>
                  <th className="pb-2 pr-3 text-right font-medium">부족분 (일반 전환)</th>
                  <th className="pb-2 font-medium">결과</th>
                </tr>
              </thead>
              <tbody>
                {calc.securedDetails.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50">
                    <td className="py-2 pr-3 font-medium text-slate-900">{c.creditor_name}</td>
                    <td className="py-2 pr-3 text-right text-slate-700">{formatCurrency(c.total_claim_amount)}</td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        min={0}
                        value={collateralValues[c.id] ?? ''}
                        placeholder="0"
                        onChange={(e) =>
                          setCollateralValues((prev) => ({ ...prev, [c.id]: Number(e.target.value) || 0 }))
                        }
                        aria-label={`${c.creditor_name} 담보 추정가`}
                        className="w-36 rounded border border-slate-200 px-2 py-1 text-right text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {c.shortfall > 0 ? (
                        <span className="text-orange-600">{formatCurrency(c.shortfall)}</span>
                      ) : (
                        <span className="text-green-600">-</span>
                      )}
                    </td>
                    <td className="py-2">
                      {c.isCovered ? (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="h-3 w-3" aria-hidden="true" /> 담보 충족
                        </span>
                      ) : c.collVal > 0 ? (
                        <span className="flex items-center gap-1 text-xs text-orange-600">
                          <AlertTriangle className="h-3 w-3" aria-hidden="true" /> 부족
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">담보가 미입력</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {calc.securedShortfallTotal > 0 && (
                <tfoot>
                  <tr className="bg-orange-50">
                    <td colSpan={3} className="py-2 pr-3 text-xs font-medium text-orange-700">
                      일반채권으로 전환되는 별제권 부족분
                    </td>
                    <td className="py-2 pr-3 text-right text-sm font-bold text-orange-700">
                      {formatCurrency(calc.securedShortfallTotal)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* M05: 우선변제채권 */}
      {priority.length > 0 && (
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-purple-500" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-700">
              우선변제채권 (M05)
              <span className="ml-2 text-xs font-normal text-slate-400">전액 변제 필수</span>
            </h2>
          </div>

          <div className="space-y-2">
            {priority.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg bg-purple-50 px-3 py-2">
                <span className="text-sm font-medium text-purple-900">{c.creditor_name}</span>
                <span className="text-sm font-bold text-purple-800">{formatCurrency(c.total_claim_amount)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-lg bg-purple-100 px-3 py-2">
              <span className="text-sm font-semibold text-purple-900">우선변제 합계</span>
              <span className="font-bold text-purple-900">{formatCurrency(calc.totalPriority)}</span>
            </div>

            {!calc.priorityFeasible && calc.totalPool > 0 && (
              <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" aria-hidden="true" />
                <span>
                  총 변제재원({formatCurrency(calc.totalPool)})이 우선변제 합계보다 부족합니다.
                  월 수입을 높이거나 변제기간(60개월)을 고려하세요.
                </span>
              </div>
            )}
            {calc.priorityFeasible && calc.totalPool > 0 && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
                <CheckCircle className="h-3 w-3" aria-hidden="true" />
                <span>우선변제채권 전액 충당 가능</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* M06: 변제계획 산출 */}
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-600" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-700">
            변제계획 안분비례 산출 (M06)
          </h2>
        </div>

        {creditors.length === 0 ? (
          <p className="text-sm text-slate-400">채권자목록에 채권자를 먼저 등록해주세요.</p>
        ) : income === 0 ? (
          <p className="text-sm text-slate-400">월 수입을 입력하면 자동 계산됩니다.</p>
        ) : (
          <>
            {/* 재원 배분 요약 */}
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              {[
                { label: '총 변제재원', value: formatCurrency(calc.totalPool) },
                { label: '우선변제 공제', value: formatCurrency(calc.totalPriority) },
                { label: '일반채권 안분재원', value: formatCurrency(calc.generalPool) },
                { label: '일반채권 총액 (별제 부족 포함)', value: formatCurrency(calc.totalGeneralAdjusted) },
                {
                  label: '일반채권 변제율',
                  value: `${calc.generalRatePct.toFixed(2)}%`,
                },
                { label: '총 변제 예정액', value: formatCurrency(calc.totalRepayment) }
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-slate-50 px-3 py-2.5">
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-800">{item.value}</p>
                </div>
              ))}
            </div>

            {/* 안분비례 채권자 명세 */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs" aria-label="안분비례 배분 명세">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-slate-500">
                    <th className="pb-1.5 pr-3 font-medium">채권자</th>
                    <th className="pb-1.5 pr-3 font-medium">구분</th>
                    <th className="pb-1.5 pr-3 text-right font-medium">채권액</th>
                    <th className="pb-1.5 pr-3 text-right font-medium">배분액</th>
                    <th className="pb-1.5 text-right font-medium">변제율</th>
                  </tr>
                </thead>
                <tbody>
                  {calc.allocations.map((a, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-1 pr-3 text-slate-700">{a.creditorName}</td>
                      <td className="py-1 pr-3">
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                            a.claimClass === 'secured'
                              ? 'bg-orange-100 text-orange-700'
                              : a.claimClass === 'priority'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {a.claimClass === 'secured' ? '별제권' : a.claimClass === 'priority' ? '우선변제' : '일반'}
                        </span>
                      </td>
                      <td className="py-1 pr-3 text-right text-slate-600">
                        {formatCurrency(a.originalAmount)}
                      </td>
                      <td className="py-1 pr-3 text-right font-medium text-slate-800">
                        {formatCurrency(a.allocatedAmount)}
                      </td>
                      <td
                        className={`py-1 text-right font-medium ${
                          a.allocationRatePct >= 100
                            ? 'text-green-600'
                            : a.allocationRatePct >= 50
                            ? 'text-amber-600'
                            : 'text-red-500'
                        }`}
                      >
                        {a.allocationRatePct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50">
                    <td colSpan={2} className="py-1.5 pr-3 text-xs font-semibold text-slate-600">합계</td>
                    <td className="py-1.5 pr-3 text-right text-xs font-semibold">
                      {formatCurrency(calc.allocations.reduce((s, a) => s + a.originalAmount, 0))}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-xs font-bold text-slate-900">
                      {formatCurrency(calc.totalRepayment)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 실현 가능성 표시 */}
            <div
              className={`mt-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
                calc.feasible ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
              }`}
              role="status"
              aria-live="polite"
            >
              {calc.feasible ? (
                <CheckCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              )}
              <span className="font-medium">
                {calc.feasible
                  ? `변제계획 성립 가능 — 일반채권 변제율 ${calc.generalRatePct.toFixed(2)}%`
                  : calc.disposable <= 0
                  ? '월 수입이 최저생계비 이하입니다. 수입을 재확인하거나 생계비 기준을 조정하세요.'
                  : '우선변제채권을 충당하기 어렵습니다. 60개월 변제기간 또는 수입 증가를 검토하세요.'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* 저장 버튼 */}
      <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <div>
          <p className="text-sm font-medium text-slate-700">계산 결과를 변제계획 초안으로 저장합니다</p>
          <p className="text-xs text-slate-400">저장 시 새 버전 번호가 부여됩니다. 이전 계획은 그대로 유지됩니다.</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !canSave}
          aria-label="변제계획 저장"
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {saving ? '저장 중...' : '변제계획 저장'}
        </Button>
      </div>
    </div>
  );
}
