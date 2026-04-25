'use client';

import { useState, useMemo, useCallback, useTransition } from 'react';
import { useToast } from '@/components/ui/toast-provider';
import { upsertRehabIncomeSettings } from '@/lib/actions/rehabilitation-actions';
import {
  calculateRepayment,
  calculateSecuredAllocations,
  calculateLiquidationValue,
  generateRepaySchedule,
  validateScheduleTotals,
  getLivingCost,
  calculateMonthlyAvailable,
  determineFormType,
  calculateDisposalAmount,
  validateSecuredVsProperties,
  formatMoney,
  buildPlanCoreSections,
} from '@/lib/rehabilitation';
import { buildSection10Clauses } from '@/lib/rehabilitation/rules/plan-section10-rules';
import type {
  RehabCreditor,
  RehabSecuredProperty,
  RehabPropertyItem,
  RepaymentInput,
  RepayPeriodOption,
  RepayType,
} from '@/lib/rehabilitation';

interface RehabPlanTabProps {
  caseId: string;
  organizationId: string;
  creditors: Record<string, unknown>[];
  securedProperties: Record<string, unknown>[];
  properties: Record<string, unknown>[];
  propertyDeductions: Record<string, unknown>[];
  incomeSettings: Record<string, unknown> | null;
  familyMembers: Record<string, unknown>[];
  planSections: Record<string, unknown>[];
  applicationDate?: string | null;
  repaymentStartDate?: string | null;
}

const PLAN_SECTION_LABELS = [
  '1. 변제기간',
  '2. 변제에 제공되는 소득 또는 재산',
  '3. 개인회생재단채권에 대한 변제',
  '4. 일반의 우선권 있는 개인회생채권에 대한 변제',
  '5. 별제권부 채권 및 이에 준하는 채권의 처리',
  '6. 일반 개인회생채권에 대한 변제',
  '7. 미확정 개인회생채권에 대한 조치',
  '8. 변제금원의 회생위원에 대한 임치 및 지급',
  '9. 면책의 범위 및 효력발생시기',
  '10. 기타사항',
];

export function RehabPlanTab({
  caseId,
  organizationId,
  creditors: rawCreditors,
  securedProperties: rawSecured,
  properties: rawProperties,
  propertyDeductions: rawDeductions,
  incomeSettings,
  familyMembers,
  planSections: rawPlanSections,
  applicationDate,
  repaymentStartDate,
}: RehabPlanTabProps) {
  const { success, error } = useToast();
  const [isSaving, startSaveTransition] = useTransition();

  const initialOption = (incomeSettings?.repay_period_option as RepayPeriodOption) || 'capital36';
  const initialMonths = (incomeSettings?.repay_months as number) || 60;
  const [repayOption, setRepayOption] = useState<RepayPeriodOption>(initialOption);
  const [repayType, setRepayType] = useState<RepayType>(
    ((incomeSettings?.repay_type as string) || 'sequential') as RepayType,
  );
  const [formMode, setFormMode] = useState<'standard' | 'simple'>('standard');

  // 제10항 수동 추가사항만 편집 가능
  const [section10Addendum, setSection10Addendum] = useState(
    (incomeSettings?.section10_manual_addendum as string) || '',
  );

  // 데이터 변환
  const creditors: RehabCreditor[] = useMemo(
    () =>
      rawCreditors.map((c) => ({
        id: c.id as string,
        bondNumber: (c.bond_number as number) || 0,
        classify: (c.classify as '자연인' | '법인') || '법인',
        creditorName: (c.creditor_name as string) || '',
        branchName: (c.branch_name as string) || '',
        postalCode: '',
        address: '',
        phone: (c.phone as string) || '',
        fax: '',
        mobile: '',
        bondCause: (c.bond_cause as string) || '',
        capital: (c.capital as number) || 0,
        capitalCompute: '',
        interest: (c.interest as number) || 0,
        interestCompute: '',
        delayRate: (c.delay_rate as number) || 0,
        bondContent: '',
        isSecured: (c.is_secured as boolean) || false,
        securedCollateralValue: Number(c.secured_collateral_value) || 0,
        isOtherUnconfirmed: (c.is_other_unconfirmed as boolean) || false,
        securedPropertyId: (c.secured_property_id as string) || null,
        lienPriority: (c.lien_priority as number) || 1,
        lienType: (c.lien_type as string) || '',
        maxClaimAmount: (c.max_claim_amount as number) || 0,
        hasPriorityRepay: (c.has_priority_repay as boolean) || false,
        isUnsettled: (c.is_unsettled as boolean) || false,
        isAnnuityDebt: (c.is_annuity_debt as boolean) || false,
        applyRestructuring: (c.apply_restructuring as boolean) || false,
        attachments: [],
        unsettledReason: (c.unsettled_reason as string) || '',
        unsettledAmount: (c.unsettled_amount as number) || 0,
        unsettledText: (c.unsettled_text as string) || '',
        guarantorName: (c.guarantor_name as string) || '',
        guarantorAmount: (c.guarantor_amount as number) || 0,
        guarantorText: (c.guarantor_text as string) || '',
      })),
    [rawCreditors],
  );

  const securedProperties: RehabSecuredProperty[] = useMemo(
    () =>
      rawSecured.map((p) => ({
        id: p.id as string,
        propertyType: (p.property_type as string) || '',
        description: (p.description as string) || '',
        marketValue: (p.market_value as number) || 0,
        valuationRate: (p.valuation_rate as number) || 70,
        note: (p.note as string) || '',
      })),
    [rawSecured],
  );

  // 재산 청산가치 계산
  const propertyItems: RehabPropertyItem[] = useMemo(
    () =>
      rawProperties.map((p) => ({
        id: p.id as string,
        category: (p.category as string) || 'cash',
        detail: (p.detail as string) || '',
        amount: (p.amount as number) || 0,
        seizure: (p.seizure as string) || '',
        repayUse: (p.repay_use as string) || '',
        isProtection: (p.is_protection as boolean) || false,
      })),
    [rawProperties],
  );

  const deductionMap = useMemo(
    () => Object.fromEntries(rawDeductions.map((d) => [d.category as string, d.deduction_amount as number])),
    [rawDeductions],
  );

  const liquidationResult = useMemo(
    () => calculateLiquidationValue(propertyItems, deductionMap),
    [propertyItems, deductionMap],
  );
  const liquidationValue = liquidationResult.total;

  // 별제권 배분
  const securedResults = useMemo(
    () => calculateSecuredAllocations(securedProperties, creditors),
    [securedProperties, creditors],
  );

  // 별제권↔재산목록 크로스 검증
  const securedPropertyWarnings = useMemo(
    () => validateSecuredVsProperties(securedProperties, propertyItems),
    [securedProperties, propertyItems],
  );

  // 소득 데이터 — DB 컬럼명 매핑 (median_income_year, net_salary)
  // dependentCount = 부양가족 수 (본인 제외). getLivingCost 내부에서 1+dependents로 가구수 계산
  const dependentCount = familyMembers.filter((m) => m.is_dependent).length;
  const incomeYear = (incomeSettings?.median_income_year as number) || new Date().getFullYear();
  const monthlyIncome =
    (incomeSettings?.net_salary as number) ||
    (incomeSettings?.monthly_income as number) ||
    0;
  // DB에 저장된 living_cost 사용 (소득 탭에서 rate 적용 후 계산된 값)
  // 폴백: DB 값 없으면 기본 기준중위소득 60%
  const livingCost = (incomeSettings?.living_cost as number) || getLivingCost(incomeYear, dependentCount);
  const extraLivingCost = (incomeSettings?.extra_living_cost as number) || 0;
  const childSupport = (incomeSettings?.child_support as number) || 0;
  const trusteeCommRate = (incomeSettings?.trustee_comm_rate as number) || 0;
  const disposeAmount = (incomeSettings?.dispose_amount as number) || 0;
  const disposePeriod: 1 | 2 = (Number(incomeSettings?.dispose_period) || 1) <= 1 ? 1 : 2;

  // 변제개시일 기본값 제안: 개시신청일 + 90일
  const currentStartDate = repaymentStartDate || undefined;
  const suggestedStartDate = useMemo(() => {
    if (currentStartDate) return null; // 이미 설정됨
    if (!applicationDate) return null;
    const d = new Date(applicationDate);
    if (isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + 90);
    return d.toISOString().slice(0, 10);
  }, [applicationDate, currentStartDate]);

  // 변제계획 계산
  const repaymentResult = useMemo(() => {
    if (creditors.length === 0 || monthlyIncome <= 0) return null;

    const input: RepaymentInput = {
      creditors: creditors.map((c) => ({
        capital: c.capital,
        interest: c.interest,
        isSecured: c.isSecured,
        securedCollateralValue: c.securedCollateralValue,
        hasPriorityRepay: c.hasPriorityRepay,
      })),
      securedResults,
      monthlyIncome,
      livingCost,
      extraLivingCost,
      childSupport,
      trusteeCommRate,
      disposeAmount,
      repayOption,
      liquidationValue,
    };

    return calculateRepayment(input);
  }, [creditors, securedResults, monthlyIncome, livingCost, extraLivingCost, childSupport, trusteeCommRate, disposeAmount, repayOption, liquidationValue]);

  const handleSavePlan = useCallback(() => {
    if (!repaymentResult) return;
    startSaveTransition(async () => {
      // 청산가치보장 충족 여부: 현재가치 > 청산가치이면 자연 충족 (D5110)
      const isLiqGuaranteed = repaymentResult.presentValue != null && repaymentResult.presentValue > liquidationValue;
      const result = await upsertRehabIncomeSettings(caseId, organizationId, {
        repay_period_option: repayOption,
        repay_months: repaymentResult.repayMonths,
        monthly_available: repaymentResult.monthlyAvailable,
        monthly_repay: repaymentResult.monthlyRepay,
        total_repay_amount: repaymentResult.totalRepayAmount,
        repay_rate: repaymentResult.repayRate,
        repay_type: repayType,
        liquidation_guaranteed: isLiqGuaranteed,
        period_setting: (() => {
          const map: Record<string, number> = { capital60: 1, both60: 2, capital100_5y: 3, capital100_3y: 4, both36: 5, capital36: 6 };
          return map[repayOption] ?? 6;
        })(),
        section10_manual_addendum: section10Addendum || null,
      });
      if (result.ok) {
        success('변제계획 저장 완료', { message: '문서 출력에 반영됩니다.' });
      } else {
        error('저장 실패', { message: result.userMessage || '변제계획 저장에 실패했습니다.' });
      }
    });
  }, [caseId, organizationId, repayOption, repayType, repaymentResult, section10Addendum, success, error, startSaveTransition]);

  // 변제계획안 제1~9항 자동 생성 (읽기전용, 계산 결과에서 도출)
  const planCoreSections = useMemo(() => {
    if (!repaymentResult) return null;
    return buildPlanCoreSections({
      repaymentStartDate: repaymentStartDate || '변제개시일',
      repayMonths: repaymentResult.repayMonths,
      monthlyIncome: monthlyIncome,
      livingCost,
      monthlyAvailable: repaymentResult.monthlyAvailable,
      incomeType: ((incomeSettings?.income_type as string) === 'business' ? 'business' : 'salary'),
      monthlyRepay: repaymentResult.monthlyRepay,
      totalRepayAmount: repaymentResult.totalRepayAmount,
      repayRate: repaymentResult.repayRate,
      totalDebt: repaymentResult.totalDebt,
      totalCapital: repaymentResult.totalCapital,
      totalInterest: repaymentResult.totalInterest,
      presentValue: repaymentResult.presentValue,
      liquidationValue,
      disposeAmount,
      disposePeriod,
      trusteeCommRate,
      propertyItems: propertyItems.map((p) => ({
        detail: p.detail || '',
        category: p.category || '',
        amount: p.amount || 0,
        isProtection: p.isProtection || false,
      })),
    });
  }, [repaymentResult, repaymentStartDate, monthlyIncome, livingCost, incomeSettings, liquidationValue, disposeAmount, disposePeriod, trusteeCommRate, propertyItems]);

  // 제10항: buildSection10Clauses + manual addendum
  const section10Clauses = useMemo(() => {
    const rawCreds = rawCreditors.map((c) => ({ ...c }));
    const formType = repaymentResult
      ? determineFormType(repaymentResult.presentValue, liquidationValue)
      : 'D5110' as const;
    return buildSection10Clauses(rawCreds, formType, disposePeriod, disposePeriod <= 1 ? 1.3 : 1.5);
  }, [rawCreditors, repaymentResult, liquidationValue, disposePeriod]);

  // capitalOnly: 원금만 변제하는 옵션인지 (이자 면책)
  const isCapitalOnly = ['capital36', 'capital60', 'capital100_3y', 'capital100_5y'].includes(repayOption);

  // 변제 스케줄
  const schedule = useMemo(() => {
    if (!repaymentResult || repaymentResult.monthlyRepay <= 0) return [];
    return generateRepaySchedule(
      creditors,
      repaymentResult.monthlyRepay,
      repaymentResult.repayMonths,
      disposeAmount,
      repayType,
      isCapitalOnly,
    );
  }, [creditors, repaymentResult, disposeAmount, repayType, isCapitalOnly]);

  // 스케줄 검증
  const scheduleValid = useMemo(() => {
    if (!repaymentResult || schedule.length === 0) return { monthlyValid: true, totalValid: true };
    return validateScheduleTotals(schedule, repaymentResult.monthlyRepay, repaymentResult.totalRepayAmount);
  }, [schedule, repaymentResult]);

  if (creditors.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400">
        <p className="font-medium">채권자 정보가 없습니다</p>
        <p className="mt-1 text-sm">채권자 탭에서 채권자를 먼저 등록해주세요</p>
      </div>
    );
  }

  if (monthlyIncome <= 0) {
    return (
      <div className="py-12 text-center text-slate-400">
        <p className="font-medium">소득 정보가 없습니다</p>
        <p className="mt-1 text-sm">소득/생계비 탭에서 월 소득을 먼저 입력해주세요</p>
      </div>
    );
  }

  // 가용소득이 0 이하인 경우 안내 (월 소득 < 생계비)
  // 이전에는 빈 화면(변제 옵션만)으로 빠져 사용자 혼란 발생
  if (!repaymentResult) {
    const monthlyAvail = monthlyIncome - livingCost - extraLivingCost - childSupport;
    return (
      <div className="space-y-4">
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">변제계획을 산출할 수 없습니다</p>
          <p className="mt-1 text-sm text-amber-700">
            월 소득({formatMoney(monthlyIncome)}원)에서 생계비({formatMoney(livingCost)}원)를 차감한
            가용소득이 {formatMoney(monthlyAvail)}원입니다. 변제 가능액이 0 이하이면 변제계획을
            수립할 수 없습니다.
          </p>
          <p className="mt-2 text-xs text-amber-600">
            ▸ 부양가족 수가 정확한지 신청인 탭에서 확인해주세요<br />
            ▸ 월 소득이 정확한지 소득/생계비 탭에서 확인해주세요
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500"><span className="text-red-500">*</span> 필수 입력 항목입니다</p>
      {/* D5112 간이양식 / 정식양식 토글 */}
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <span className="text-sm font-medium text-slate-700">변제계획안 양식</span>
        <div className="inline-flex rounded-md border border-slate-300">
          <button
            type="button"
            onClick={() => setFormMode('standard')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${formMode === 'standard' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'} rounded-l-md`}
            aria-label="정식양식 보기"
            aria-pressed={formMode === 'standard'}
          >
            정식양식
          </button>
          <button
            type="button"
            onClick={() => setFormMode('simple')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${formMode === 'simple' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'} rounded-r-md`}
            aria-label="간이양식(D5112) 보기"
            aria-pressed={formMode === 'simple'}
          >
            간이양식 (D5112)
          </button>
        </div>
        {formMode === 'simple' && (
          <span className="text-xs text-slate-400">가용소득·변제기간·채권자배분만 표시</span>
        )}
      </div>

      {/* D5112 간이양식 뷰 */}
      {formMode === 'simple' && repaymentResult && (
        <div className="space-y-4">
          {/* 1절: 변제기간 */}
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">제1절 변제기간</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="text-center rounded-md bg-slate-50 p-3">
                <p className="text-xs text-slate-500">변제기간</p>
                <p className="mt-1 text-lg font-bold text-slate-800">{repaymentResult.repayMonths}개월</p>
              </div>
              <div className="text-center rounded-md bg-slate-50 p-3">
                <p className="text-xs text-slate-500">변제방법</p>
                <p className="mt-1 text-lg font-bold text-slate-800">{(incomeSettings?.repayment_method as string) || '매월'}</p>
              </div>
              <div className="text-center rounded-md bg-slate-50 p-3">
                <p className="text-xs text-slate-500">변제율</p>
                <p className="mt-1 text-lg font-bold text-green-700">{repaymentResult.repayRate.toFixed(2)}%</p>
              </div>
            </div>
          </section>

          {/* 2절: 소득/재산 */}
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">제2절 변제에 제공되는 소득 및 재산</h3>
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-slate-600">가. 소득</h4>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-md border border-slate-100 p-3">
                  <p className="text-xs text-slate-500">월 수입(실수령)</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{formatMoney(monthlyIncome)}원</p>
                </div>
                <div className="rounded-md border border-slate-100 p-3">
                  <p className="text-xs text-slate-500">월 생계비</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{formatMoney(livingCost + extraLivingCost)}원</p>
                </div>
                <div className="rounded-md border border-slate-100 p-3">
                  <p className="text-xs text-slate-500">월 가용소득</p>
                  <p className="mt-1 text-sm font-semibold text-blue-700">{formatMoney(repaymentResult.monthlyAvailable)}원</p>
                </div>
              </div>
              {disposeAmount > 0 && (
                <>
                  <h4 className="mt-3 text-xs font-medium text-slate-600">나. 재산처분</h4>
                  <div className="rounded-md border border-slate-100 p-3">
                    <p className="text-xs text-slate-500">처분예상액</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{formatMoney(disposeAmount)}원</p>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* 6절: 계산 결과 기초사항 */}
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">제6절 계산 결과</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="text-center rounded-md bg-slate-50 p-3">
                <p className="text-xs text-slate-500">총 채무액</p>
                <p className="mt-1 text-sm font-bold text-slate-800">{formatMoney(repaymentResult.totalDebt)}원</p>
              </div>
              <div className="text-center rounded-md bg-slate-50 p-3">
                <p className="text-xs text-slate-500">월 변제액</p>
                <p className="mt-1 text-sm font-bold text-blue-700">{formatMoney(repaymentResult.monthlyRepay)}원</p>
              </div>
              <div className="text-center rounded-md bg-slate-50 p-3">
                <p className="text-xs text-slate-500">총 변제액</p>
                <p className="mt-1 text-sm font-bold text-slate-800">{formatMoney(repaymentResult.totalRepayAmount)}원</p>
              </div>
              <div className="text-center rounded-md bg-slate-50 p-3">
                <p className="text-xs text-slate-500">청산가치</p>
                <p className="mt-1 text-sm font-bold text-slate-800">{formatMoney(liquidationValue)}원</p>
              </div>
            </div>
            {repaymentResult.liquidationWarning && (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700" role="alert">
                청산가치보장 원칙에 따라 월 변제액이 상향 조정되었습니다.
              </div>
            )}
          </section>

          {/* 채권자별 변제배분 (간이) */}
          {schedule.length > 0 && (
            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">채권자별 변제예정액</h3>
              {isCapitalOnly && (
                <p className="mb-2 text-xs text-blue-700">원금만 변제 — 이자는 면책 대상</p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 w-10">번호</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-slate-500">채권자</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-slate-500">{isCapitalOnly ? '원금' : '채권액'}</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-slate-500">월 변제액</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-slate-500">총 변제액</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-slate-500">변제율</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((s, idx) => {
                      const creditor = creditors.find((c) => c.id === s.creditorId);
                      const claimAmount = creditor
                        ? (creditor.capital + (isCapitalOnly ? 0 : creditor.interest))
                        : (s.ratio > 0 ? Math.round(s.totalAmount / s.ratio) : 0);
                      return (
                        <tr key={s.creditorId} className="border-b border-slate-100">
                          <td className="px-2 py-2 text-center text-slate-500">{idx + 1}</td>
                          <td className="px-2 py-2 font-medium text-slate-700">{creditor?.creditorName || `채권자 ${idx + 1}`}</td>
                          <td className="px-2 py-2 text-right text-slate-600">{formatMoney(claimAmount)}원</td>
                          <td className="px-2 py-2 text-right text-slate-600">{formatMoney(s.monthlyAmount)}원</td>
                          <td className="px-2 py-2 text-right font-medium text-slate-700">{formatMoney(s.totalAmount)}원</td>
                          <td className="px-2 py-2 text-right text-green-700">{(s.ratio * 100).toFixed(2)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 font-semibold">
                      <td colSpan={3} className="px-2 py-2 text-slate-800">합계</td>
                      <td className="px-2 py-2 text-right text-blue-700">
                        {formatMoney(schedule.reduce((s, r) => s + r.monthlyAmount, 0))}원
                      </td>
                      <td className="px-2 py-2 text-right text-blue-700">
                        {formatMoney(schedule.reduce((s, r) => s + r.totalAmount, 0))}원
                      </td>
                      <td className="px-2 py-2 text-right text-slate-600">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}

          {/* 저장 버튼 (간이양식) */}
          <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
            <button
              type="button"
              onClick={handleSavePlan}
              disabled={isSaving}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              aria-label="변제계획 저장"
            >
              {isSaving ? '저장 중...' : '변제계획 저장'}
            </button>
            <p className="mt-1 text-center text-xs text-slate-500">저장해야 문서 출력에 반영됩니다</p>
          </div>
        </div>
      )}

      {formMode === 'simple' && !repaymentResult && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-400">
          <p className="font-medium">간이양식을 표시하려면 변제계획 계산이 필요합니다</p>
          <p className="mt-1 text-sm">정식양식에서 변제 옵션을 선택하고 저장해주세요</p>
        </div>
      )}

      {/* 정식양식 — 변제 옵션 선택 */}
      {formMode === 'standard' && <>
      {/* 변제 옵션 선택 */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-800">변제 옵션</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="repay_option" className="text-sm font-medium text-slate-700">변제기간</label>
            <select
              id="repay_option"
              value={repayOption}
              onChange={(e) => setRepayOption(e.target.value as RepayPeriodOption)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="변제기간 옵션 선택"
            >
              <option value="capital36">원금 3년 변제</option>
              <option value="both36">원리금 3년 변제</option>
              <option value="capital60">원금 5년 변제</option>
              <option value="both60">원리금 5년 변제</option>
              <option value="capital100_3y">원금 100% (3년 이내)</option>
              <option value="capital100_5y">원금 100% (5년 이내)</option>
              <option value="full3y">3년 전액 변제</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="repay_type" className="text-sm font-medium text-slate-700">변제 방식</label>
            <select
              id="repay_type"
              value={repayType}
              onChange={(e) => setRepayType(e.target.value as RepayType)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="변제 방식 선택"
            >
              <option value="sequential">원리금변제 (원금 우선)</option>
              <option value="combined">원리금합산변제 (비율 배분)</option>
              <option value="tieredTaxPriority">단계변제 (조세우선)</option>
            </select>
          </div>
        </div>
      </section>

      {/* D5110 납부 정보 */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-800">납부 정보 (D5110)</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="trustee_name" className="text-sm font-medium text-slate-700">개인회생위원명</label>
            <input
              id="trustee_name"
              type="text"
              value={(incomeSettings?.trustee_name as string) || ''}
              readOnly
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
              placeholder="소득/생계비 탭에서 입력"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="trustee_account" className="text-sm font-medium text-slate-700">변제금 납부계좌</label>
            <input
              id="trustee_account"
              type="text"
              value={(incomeSettings?.trustee_account as string) || ''}
              readOnly
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
              placeholder="소득/생계비 탭에서 입력"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="repayment_method_display" className="text-sm font-medium text-slate-700">변제방법</label>
            <input
              id="repayment_method_display"
              type="text"
              value={(incomeSettings?.repayment_method as string) || '매월'}
              readOnly
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
            />
          </div>
        </div>
      </section>

      {/* 변제개시일 제안 */}
      {suggestedStartDate && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700" role="status">
          변제개시일이 미설정입니다. 개시신청일({applicationDate}) 기준 제안일: <strong>{suggestedStartDate}</strong>
          <br />
          <span className="text-xs text-blue-500">변제개시일은 개시신청일로부터 60~90일 이내로 정하는 것이 일반적입니다 (권고사항)</span>
        </div>
      )}

      {/* 별제권↔재산목록 크로스 검증 경고 */}
      {securedPropertyWarnings.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800" role="alert">
          {securedPropertyWarnings.map((w) => (
            <p key={w.securedPropertyId} className="mb-1 last:mb-0">
              {w.message}
            </p>
          ))}
        </div>
      )}

      {/* 계산 결과 요약 */}
      {repaymentResult && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-base font-semibold text-slate-800">변제계획 요약</h2>

          {repaymentResult.priorityInsufficient && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              <strong>변제계획 수립 불가:</strong> 가용소득이 우선변제채권 총액({formatMoney(repaymentResult.priorityDebt)}원)보다 적습니다.
              변제기간 연장(최대 60개월) 또는 가용소득 증액이 필요합니다.
            </div>
          )}

          {repaymentResult.priorityDebt > 0 && !repaymentResult.priorityInsufficient && (
            <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700" role="alert">
              우선변제채권 {formatMoney(repaymentResult.priorityDebt)}원이 100% 변제 보장됩니다 (법 §583, §614①).
            </div>
          )}

          {/* D5110 vs D5111 자동 판정 */}
          {(() => {
            const formType = determineFormType(repaymentResult.presentValue, liquidationValue);
            return formType === 'D5111' ? (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
                <strong>D5111 (재산처분 필요):</strong> 가용소득 총변제의 현재가치({formatMoney(repaymentResult.presentValue ?? 0)}원)가
                청산가치({formatMoney(liquidationValue)}원) 이하입니다.
                {(() => {
                  const disposal = calculateDisposalAmount(liquidationValue, repaymentResult.presentValue ?? 0, disposePeriod, trusteeCommRate > 0);
                  const multiplierLabel = disposePeriod <= 1 ? '1년이내, 승수 1.3' : '2년이내, 승수 1.5';
                  return disposal > 0 ? ` 변제투입예정액: ${formatMoney(disposal)}원 (${multiplierLabel})` : '';
                })()}
                <p className="mt-2 text-xs text-red-600">
                  해결 방안: ① 변제기간을 48개월·60개월로 연장 (현재가치 증가) ② 생계비 비율을 낮춰 가용소득 증가
                  ③ 재산처분형 변제(D5111)로 부족분을 재산에서 충당
                </p>
              </div>
            ) : (
              <div className="mb-3 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700" role="alert">
                <strong>D5110 (가용소득만):</strong> 재산처분 불필요. 현재가치({formatMoney(repaymentResult.presentValue ?? 0)}원) &gt; 청산가치({formatMoney(liquidationValue)}원).
              </div>
            );
          })()}

          {repaymentResult.liquidationWarning && (
            <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700" role="alert">
              청산가치보장 원칙에 따라 월 변제액이 상향 조정되었습니다.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
              <p className="text-xs text-slate-500">월 변제액</p>
              <p className="mt-1 text-lg font-bold text-blue-700">{formatMoney(repaymentResult.monthlyRepay)}원</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
              <p className="text-xs text-slate-500">변제기간</p>
              <p className="mt-1 text-lg font-bold text-slate-800">{repaymentResult.repayMonths}개월</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
              <p className="text-xs text-slate-500">총 변제액</p>
              <p className="mt-1 text-lg font-bold text-slate-800">{formatMoney(repaymentResult.totalRepayAmount)}원</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
              <p className="text-xs text-slate-500">변제율</p>
              <p className="mt-1 text-lg font-bold text-green-700">{repaymentResult.repayRate.toFixed(1)}%</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              { label: '총 채무액', value: repaymentResult.totalDebt },
              { label: '원금 합계', value: repaymentResult.totalCapital },
              { label: '이자 합계', value: repaymentResult.totalInterest },
              { label: '월 가용소득', value: repaymentResult.monthlyAvailable },
              { label: '청산가치', value: liquidationValue },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className="text-sm font-medium text-slate-700">{formatMoney(item.value)}원</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 채권자별 변제 스케줄 */}
      {schedule.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">채권자별 변제 배분</h2>
            {(!scheduleValid.monthlyValid || !scheduleValid.totalValid) && (
              <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-600">
                합계 불일치
              </span>
            )}
          </div>

          {isCapitalOnly && (
            <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 p-2 text-xs text-blue-700">
              원금만 변제 옵션입니다. 이자는 면책 대상이므로 변제 배분에 포함되지 않습니다.
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-2 py-2 text-left text-xs font-medium text-slate-500">채권자</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-slate-500">배분비율</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-slate-500">월 변제액</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-slate-500">총 변제액</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-slate-500">원금 변제</th>
                  {!isCapitalOnly && (
                    <th className="px-2 py-2 text-right text-xs font-medium text-slate-500">이자 변제</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {schedule.map((s, idx) => {
                  const creditor = creditors.find((c) => c.id === s.creditorId);
                  return (
                    <tr key={s.creditorId} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-medium text-slate-700">
                        {creditor?.creditorName || `채권자 ${idx + 1}`}
                      </td>
                      <td className="px-2 py-2 text-right text-slate-600">{(s.ratio * 100).toFixed(2)}%</td>
                      <td className="px-2 py-2 text-right text-slate-600">{formatMoney(s.monthlyAmount)}원</td>
                      <td className="px-2 py-2 text-right font-medium text-slate-700">{formatMoney(s.totalAmount)}원</td>
                      <td className="px-2 py-2 text-right text-slate-600">{formatMoney(s.capitalRepay)}원</td>
                      {!isCapitalOnly && (
                        <td className="px-2 py-2 text-right text-slate-600">{formatMoney(s.interestRepay)}원</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 font-semibold">
                  <td className="px-2 py-2 text-slate-800">합계</td>
                  <td className="px-2 py-2 text-right text-slate-600">100%</td>
                  <td className="px-2 py-2 text-right text-blue-700">
                    {formatMoney(schedule.reduce((s, r) => s + r.monthlyAmount, 0))}원
                  </td>
                  <td className="px-2 py-2 text-right text-blue-700">
                    {formatMoney(schedule.reduce((s, r) => s + r.totalAmount, 0))}원
                  </td>
                  <td className="px-2 py-2 text-right text-slate-600">
                    {formatMoney(schedule.reduce((s, r) => s + r.capitalRepay, 0))}원
                  </td>
                  {!isCapitalOnly && (
                    <td className="px-2 py-2 text-right text-slate-600">
                      {formatMoney(schedule.reduce((s, r) => s + r.interestRepay, 0))}원
                    </td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {/* 저장 버튼 */}
      {repaymentResult && (
        <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={handleSavePlan}
            disabled={isSaving}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            aria-label="변제계획 저장"
          >
            {isSaving ? '저장 중...' : '변제계획 저장'}
          </button>
          <p className="mt-1 text-center text-xs text-slate-500">저장해야 문서 출력에 반영됩니다</p>
        </div>
      )}

      {/* 변제계획안 미리보기 (제1~9항 자동 생성, 읽기전용) */}
      {planCoreSections && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-base font-semibold text-slate-800">변제계획안 (자동 생성)</h2>
          <p className="mb-3 text-xs text-slate-500">
            제1항~제9항은 입력 데이터에서 자동 생성됩니다. 채권자·재산·소득 데이터를 수정하면 자동 반영됩니다.
          </p>
          <div className="space-y-3">
            {PLAN_SECTION_LABELS.slice(0, 9).map((label, i) => (
              <div key={i} className="space-y-1">
                <p className="text-xs font-semibold text-slate-700">{label}</p>
                <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700 whitespace-pre-wrap">
                  {planCoreSections[i] || '—'}
                </div>
              </div>
            ))}

            {/* 제10항: 자동 clause + 수동 추가사항 */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-700">제10항 기타사항</p>
              {section10Clauses.length > 0 ? (
                <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700 space-y-2">
                  {section10Clauses.map((clause) => (
                    <div key={clause.id} className="whitespace-pre-wrap">
                      {clause.text}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-400">
                  해당 없음
                </div>
              )}
              <label htmlFor="section10-addendum" className="text-xs font-medium text-slate-600 mt-2 block">
                추가 기재사항 (선택)
              </label>
              <textarea
                id="section10-addendum"
                rows={2}
                value={section10Addendum}
                onChange={(e) => setSection10Addendum(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="법원 제출 시 추가로 기재할 사항이 있으면 입력하세요"
              />
            </div>
          </div>
        </section>
      )}

      {/* 별제권 배분 결과 */}
      {securedResults.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-base font-semibold text-slate-800">별제권 배분 결과</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-2 py-2 text-left text-xs font-medium text-slate-500">담보물건</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-slate-500">시가</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-slate-500">청산가치</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-slate-500">별제권 변제액</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-slate-500">회생채권 전환</th>
                </tr>
              </thead>
              <tbody>
                {securedResults.map((r) => (
                  <tr key={`${r.creditorId}-${r.propertyId}`} className="border-b border-slate-100">
                    <td className="px-2 py-2 text-slate-700">{r.propertyDesc || r.propertyType}</td>
                    <td className="px-2 py-2 text-right text-slate-600">{formatMoney(r.marketValue)}원</td>
                    <td className="px-2 py-2 text-right text-slate-600">{formatMoney(r.liquidationValue)}원</td>
                    <td className="px-2 py-2 text-right font-medium text-slate-700">{formatMoney(r.securedRehabAmount)}원</td>
                    <td className="px-2 py-2 text-right text-amber-600">{formatMoney(r.unsecuredConversion)}원</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      </>}
    </div>
  );
}
