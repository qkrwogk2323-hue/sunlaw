'use client';

import { useState, useMemo, useCallback } from 'react';
import { useToast } from '@/components/ui/toast-provider';
import {
  calculateRepayment,
  calculateSecuredAllocations,
  calculateLiquidationValue,
  generateRepaySchedule,
  validateScheduleTotals,
  getLivingCost,
  calculateMonthlyAvailable,
  formatMoney,
} from '@/lib/rehabilitation';
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
}

export function RehabPlanTab({
  caseId,
  organizationId,
  creditors: rawCreditors,
  securedProperties: rawSecured,
  properties: rawProperties,
  propertyDeductions: rawDeductions,
  incomeSettings,
  familyMembers,
}: RehabPlanTabProps) {
  const { success, error } = useToast();

  const [repayOption, setRepayOption] = useState<RepayPeriodOption>('both60');
  const [repayType, setRepayType] = useState<RepayType>('sequential');

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
        securedPropertyId: (c.secured_property_id as string) || null,
        lienPriority: (c.lien_priority as number) || 1,
        lienType: (c.lien_type as string) || '',
        maxClaimAmount: (c.max_claim_amount as number) || 0,
        hasPriorityRepay: false,
        isUnsettled: false,
        isAnnuityDebt: false,
        applyRestructuring: false,
        attachments: [],
        unsettledReason: '',
        unsettledAmount: 0,
        unsettledText: '',
        guarantorName: '',
        guarantorAmount: 0,
        guarantorText: '',
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

  // 소득 데이터
  const dependentCount = familyMembers.filter((m) => m.is_dependent).length + 1;
  const incomeYear = (incomeSettings?.income_year as number) || new Date().getFullYear();
  const monthlyIncome = (incomeSettings?.monthly_income as number) || 0;
  const livingCost = getLivingCost(incomeYear, dependentCount);
  const extraLivingCost = (incomeSettings?.extra_living_cost as number) || 0;
  const childSupport = (incomeSettings?.child_support as number) || 0;
  const trusteeCommRate = (incomeSettings?.trustee_comm_rate as number) || 3;
  const disposeAmount = (incomeSettings?.dispose_amount as number) || 0;

  // 변제계획 계산
  const repaymentResult = useMemo(() => {
    if (creditors.length === 0 || monthlyIncome <= 0) return null;

    const input: RepaymentInput = {
      creditors: creditors.map((c) => ({ capital: c.capital, interest: c.interest, isSecured: c.isSecured })),
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

  // 변제 스케줄
  const schedule = useMemo(() => {
    if (!repaymentResult || repaymentResult.monthlyRepay <= 0) return [];
    return generateRepaySchedule(
      creditors,
      repaymentResult.monthlyRepay,
      repaymentResult.repayMonths,
      disposeAmount,
      repayType,
    );
  }, [creditors, repaymentResult, disposeAmount, repayType]);

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

  return (
    <div className="space-y-6">
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
              <option value="capital60">원금 5년 변제</option>
              <option value="both60">원리금 5년 변제</option>
              <option value="capital100_5y">원금 100% (5년 이내)</option>
              <option value="capital100_3y">원금 100% (3년 이내)</option>
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
            </select>
          </div>
        </div>
      </section>

      {/* 계산 결과 요약 */}
      {repaymentResult && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-base font-semibold text-slate-800">변제계획 요약</h2>

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

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-2 py-2 text-left text-xs font-medium text-slate-500">채권자</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-slate-500">배분비율</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-slate-500">월 변제액</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-slate-500">총 변제액</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-slate-500">원금 변제</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-slate-500">이자 변제</th>
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
                      <td className="px-2 py-2 text-right text-slate-600">{formatMoney(s.interestRepay)}원</td>
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
                  <td className="px-2 py-2 text-right text-slate-600">
                    {formatMoney(schedule.reduce((s, r) => s + r.interestRepay, 0))}원
                  </td>
                </tr>
              </tfoot>
            </table>
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
    </div>
  );
}
