/**
 * 개인회생 사건 단일 스냅샷 — 모든 문서 생성의 유일한 원천.
 *
 * 설계 원칙:
 *   1. 계산은 여기서 1번만 한다. Doc-Gen은 렌더만 한다.
 *   2. COLAW 숫자를 상수로 박지 않는다. 법원양식 규칙에서 도출한다.
 *   3. 같은 입력 → 항상 같은 snapshot.
 *
 * DISCONNECT 해소:
 *   D1: liquidation_value — calculateLiquidationValue 단일 사용
 *   D2: monthly_repay — calculateRepayment 단일 사용
 *   D3: total_repay_amount — dispose 포함 통일
 *   D4: totalDebt 정의 — unsecuredCapital 단일 정의
 *   D5: repay_rate 정밀도 — 단일 계산
 *   D6: repay_type — snapshot에 포함
 *   D7: trustee_name/account — snapshot에 포함
 */

import { calculateSecuredAllocations } from './secured-allocation';
import { calculateRepayment, getDebtSummary, determineFormType, calculateDisposalAmount } from './repayment-calculator';
import { calculateLiquidationValue } from './property-valuation';
import { computeMonthlyAvailable, type MonthlyAvailableResult } from './monthly-available';
import { decidePeriodSetting, type PeriodSettingResult } from './period-setting';
import { buildSection10Clauses, type Section10Clause } from './rules/plan-section10-rules';
import { buildPlanCoreSections } from './plan-core-sections';
import { presentValue } from './leibniz';
import type { RehabPropertyItem } from './types';

// ─── 입력 타입 ──────────────────────────────────────────────────────

export interface CaseSnapshotInput {
  // 채권자
  creditors: Record<string, any>[];
  // 담보물건
  securedProperties: Record<string, any>[];
  // 재산
  properties: Record<string, any>[];
  propertyDeductions: Record<string, any>[];
  // 소득
  incomeSettings: Record<string, any>;
  // 신청서
  application: Record<string, any>;
  // 가족
  familyMembers: Record<string, any>[];
}

// ─── 출력 타입 ──────────────────────────────────────────────────────

export interface SecuredAttachmentRow {
  bondNumber: number;
  creditorName: string;
  capital: number;
  interest: number;
  totalClaim: number;
  /** ③ 별제권행사로 변제 예상 채권액 (환가예상액 기준) */
  expectedRepay: number;
  /** ④ 별제권행사로도 변제받을 수 없는 채권액 */
  deficiency: number;
  /** ⑤ 담보부 회생채권액 */
  securedRehabAmount: number;
  // 담보 상세
  lienType: string;
  lienDate: string;
  maxClaimAmount: number;
  propertyDescription: string;
  valuationRate: number;
  marketValue: number;
  estimatedRepayValue: number;
}

export interface CaseSnapshot {
  // ── 채권 요약 ──
  totalDebt: number;          // capital + interest 전체
  totalCapital: number;
  totalInterest: number;
  /** 담보부 = ⑤합계 (환가예상액 기준, 원금 전액 아님) */
  securedTotal: number;
  /** 무담보 = 총채권 - 담보부 */
  unsecuredTotal: number;
  /** 무담보 원금 (변제율 분모, 이자 제외) */
  unsecuredCapital: number;

  // ── 별제권부 처리 (부속서류 1) ──
  securedAttachment: SecuredAttachmentRow[];

  // ── 소득·생계비 ──
  netSalary: number;
  grossSalary: number;
  livingCost: number;
  monthlyAvailable: number;
  monthlyResult: MonthlyAvailableResult;

  // ── 청산가치 ──
  liquidationValue: number;

  // ── 변제계획 ──
  repayMonths: 36 | 48 | 60;
  monthlyRepay: number;
  totalRepayAmount: number;
  repayRate: number;
  presentValueAmount: number | null;
  isD5111: boolean;
  effectiveMonthlyRepay: number;
  effectiveTotalRepay: number;
  disposalAmount: number;
  /** D5111 재산처분 투입예정액 */
  disposalInvestment: number;

  // ── 기간 ──
  repayStartDate: string;
  repayEndDate: string;
  periodResult: PeriodSettingResult;

  // ── 설정 ──
  repayType: string;
  periodSetting: number;
  liquidationGuaranteed: boolean;
  trusteeName: string;
  trusteeAccount: string;
  trusteeCommRate: number;
  incomeType: 'salary' | 'business';

  // ── 10항 ──
  section10Clauses: Section10Clause[];
  section10Addendum: string;

  // ── 1~9항 ──
  planCoreSections: string[];

  // ── 일관성 검증 ──
  /** 핵심 숫자의 해시 — PDF/CSV가 같은 snapshot에서 나왔는지 검증용 */
  snapshotHash: string;
}

// ─── 빌더 ───────────────────────────────────────────────────────────

export function buildCaseSnapshot(input: CaseSnapshotInput): CaseSnapshot {
  const { creditors, securedProperties, properties, propertyDeductions, incomeSettings, application } = input;

  // ── 1. 별제권 배분 (환가예상액 기준) ──
  const securedCreditors = creditors.filter((c) => c.is_secured);
  const securedResults = calculateSecuredAllocations(
    securedProperties.map((p) => ({
      id: p.id || '',
      propertyType: p.property_type || '',
      description: p.description || '',
      marketValue: Number(p.market_value) || 0,
      valuationRate: Number(p.valuation_rate) || 70,
      note: '',
    })),
    securedCreditors.map((c) => ({
      id: c.id || '',
      creditorName: c.creditor_name || '',
      bondNumber: Number(c.bond_number) || 0,
      capital: Number(c.capital) || 0,
      interest: Number(c.interest) || 0,
      maxClaimAmount: Number(c.max_claim_amount) || 0,
      lienPriority: Number(c.lien_priority) || 1,
      lienType: c.lien_type || '',
      securedPropertyId: c.secured_property_id || null,
    } as any)),
  );

  // 별제권 attachment rows 구축
  const securedAttachment: SecuredAttachmentRow[] = securedCreditors.map((c) => {
    const cap = Number(c.capital) || 0;
    const int = Number(c.interest) || 0;
    const totalClaim = cap + int;
    const result = securedResults.find((r) => r.creditorId === c.id);

    // 환가예상액 기반 분리
    const expectedRepay = result?.securedRehabAmount ?? Math.min(Number(c.secured_collateral_value) || 0, totalClaim);
    const deficiency = Math.max(0, totalClaim - expectedRepay);

    return {
      bondNumber: Number(c.bond_number) || 0,
      creditorName: c.creditor_name || '',
      capital: cap,
      interest: int,
      totalClaim,
      expectedRepay,
      deficiency,
      securedRehabAmount: expectedRepay,
      lienType: c.lien_type || '',
      lienDate: '',
      maxClaimAmount: Number(c.max_claim_amount) || 0,
      propertyDescription: '',
      valuationRate: 70,
      marketValue: 0,
      estimatedRepayValue: expectedRepay,
    };
  });

  // ── 2. 채권 요약 (부속서류 1 결과에서 도출) ──
  const totalCapital = creditors.reduce((s, c) => s + (Number(c.capital) || 0), 0);
  const totalInterest = creditors.reduce((s, c) => s + (Number(c.interest) || 0), 0);
  const totalDebt = totalCapital + totalInterest;

  // 담보부 = ⑤합계 (부속서류 1의 securedRehabAmount 합)
  const securedTotal = securedAttachment.reduce((s, r) => s + r.securedRehabAmount, 0);
  const unsecuredTotal = totalDebt - securedTotal;

  // 무담보 원금 (변제율 분모, 이자 제외)
  const debtSummary = getDebtSummary(
    creditors.map((c) => ({
      capital: Number(c.capital) || 0,
      interest: Number(c.interest) || 0,
      isSecured: !!c.is_secured,
      securedCollateralValue: Number(c.secured_collateral_value) || 0,
    })),
    securedResults,
  );
  const unsecuredCapital = debtSummary.unsecuredCapital;

  // ── 3. 소득·생계비 ──
  const netSalary = Number(incomeSettings.net_salary) || 0;
  const grossSalary = Number(incomeSettings.gross_salary) || netSalary;
  const livingCost = Number(incomeSettings.living_cost) || 0;
  const extraLivingCost = Number(incomeSettings.extra_living_cost) || 0;
  const childSupport = Number(incomeSettings.child_support) || 0;
  const trusteeCommRate = Number(incomeSettings.trustee_comm_rate) || 0;

  // 정식 computeMonthlyAvailable 호출 — as any 제거
  const livingCostRate = Number(incomeSettings.living_cost_rate) || 100;
  const incomeYear = Number(incomeSettings.median_income_year) || new Date().getFullYear();
  const dependentCount = (input.familyMembers || []).filter((m) => m.is_dependent).length;
  const householdSize = 1 + dependentCount;

  const monthlyResult = computeMonthlyAvailable({
    monthlyIncome: netSalary,
    householdSize,
    year: incomeYear,
    livingCostRate,
    extraFamilyLowMoney: extraLivingCost,
    childSupport,
    trusteeCommissionRate: trusteeCommRate,
    // DB에 저장된 생계비를 직접 사용 (snapshot ↔ 소득탭 일관성 보장)
    livingCostOverride: livingCost > 0 ? livingCost : undefined,
  });
  const monthlyAvailable = monthlyResult.monthlyAvailable;

  // ── 4. 청산가치 (단일 계산 — D1 해소) ──
  const propertyItems: RehabPropertyItem[] = properties.map((p) => ({
    id: (p.id as string) || '',
    category: (p.category as string) || 'cash',
    detail: (p.detail as string) || '',
    amount: Number(p.amount) || 0,
    seizure: (p.seizure as string) || '',
    repayUse: (p.repay_use as string) || '',
    isProtection: !!p.is_protection,
  }));
  const deductionMap = Object.fromEntries(
    propertyDeductions.map((d) => [d.category as string, Number(d.deduction_amount) || 0]),
  );
  const liqResult = calculateLiquidationValue(propertyItems, deductionMap);
  const liquidationValue = liqResult.total;

  // ── 5. 변제기간 결정 ──
  const repayOption = (incomeSettings.repay_period_option as string) || 'capital36';
  const explicitMonths = Number(incomeSettings.repay_months) || 0;
  const forcedMonths = (explicitMonths === 36 || explicitMonths === 48 || explicitMonths === 60)
    ? explicitMonths as 36 | 48 | 60
    : undefined;
  const periodSettingNum = (Number(incomeSettings.period_setting) || 6) as 1 | 2 | 3 | 4 | 5 | 6;

  const periodResult = decidePeriodSetting({
    setting: periodSettingNum,
    creditors: creditors.map((c) => ({
      capital: Number(c.capital) || 0,
      interest: Number(c.interest) || 0,
      isSecured: !!c.is_secured,
      securedCollateralValue: Number(c.secured_collateral_value) || 0,
      isOtherUnconfirmed: !!c.is_other_unconfirmed,
    })),
    monthlyAvailable: Math.floor(monthlyAvailable),
    liquidationValue,
    forcedMonths,
  });
  const repayMonths = periodResult.months;

  // ── 6. 변제계획 계산 (단일 — D2, D3, D5 해소) ──
  const repaymentResult = calculateRepayment({
    creditors: creditors.map((c) => ({
      capital: Number(c.capital) || 0,
      interest: Number(c.interest) || 0,
      isSecured: !!c.is_secured,
      securedCollateralValue: Number(c.secured_collateral_value) || 0,
      hasPriorityRepay: !!c.has_priority_repay,
    })),
    securedResults,
    monthlyIncome: netSalary,
    livingCost,
    extraLivingCost,
    childSupport,
    trusteeCommRate,
    disposeAmount: Number(incomeSettings.dispose_amount) || 0,
    repayOption: repayOption as any,
    liquidationValue,
  });

  const baseMonthlyRepay = repaymentResult?.monthlyRepay ?? Math.floor(monthlyAvailable);
  const baseTotalRepay = repaymentResult?.totalRepayAmount ?? (baseMonthlyRepay * repayMonths);
  const pv = presentValue(baseMonthlyRepay, repayMonths);
  const isD5111 = determineFormType(pv, liquidationValue) === 'D5111';

  // D5111 강제 재계산: 총변제 < 청산가치이면 상향
  const effectiveMonthlyRepay = isD5111
    ? Math.ceil(liquidationValue / repayMonths)
    : baseMonthlyRepay;
  const effectiveTotalRepay = effectiveMonthlyRepay * repayMonths;

  const disposePeriod: 1 | 2 = (Number(incomeSettings.dispose_period) || 1) <= 1 ? 1 : 2;
  const disposalInvestment = isD5111
    ? calculateDisposalAmount(liquidationValue, pv, disposePeriod, trusteeCommRate > 0)
    : 0;

  const repayRate = unsecuredCapital > 0
    ? Math.round((effectiveTotalRepay / unsecuredCapital) * 100 * 100) / 100  // 소수 2자리
    : 0;

  // ── 7. 기간 계산 ──
  const repayStartDate = (application.repayment_start_date as string) || (application.application_date as string) || '';
  let repayEndDate = '';
  if (repayStartDate) {
    const start = new Date(repayStartDate);
    if (!isNaN(start.getTime())) {
      const end = new Date(start);
      end.setMonth(end.getMonth() + repayMonths - 1);
      repayEndDate = end.toISOString().slice(0, 10);
    }
  }

  // ── 8. 설정 ──
  const repayType = (incomeSettings.repay_type as string) || 'sequential';
  const incomeType = (incomeSettings.income_type as string) === 'business' ? 'business' as const : 'salary' as const;
  const trusteeName = (incomeSettings.trustee_name as string) || '';
  const trusteeAccount = (incomeSettings.trustee_account as string) || '';

  // ── 9. 10항 clause ──
  const formType = isD5111 ? 'D5111' as const : 'D5110' as const;
  const section10Clauses = buildSection10Clauses(creditors, formType, disposePeriod, disposePeriod <= 1 ? 1.3 : 1.5);
  const section10Addendum = (incomeSettings.section10_manual_addendum as string) || '';

  // ── 10. 1~9항 ──
  const planCoreSections = buildPlanCoreSections({
    repaymentStartDate: repayStartDate || '변제개시일',
    repayMonths,
    monthlyIncome: netSalary,
    livingCost,
    monthlyAvailable,
    incomeType,
    monthlyRepay: effectiveMonthlyRepay,
    totalRepayAmount: effectiveTotalRepay,
    repayRate,
    totalDebt,
    totalCapital,
    totalInterest,
    presentValue: pv,
    liquidationValue,
    disposeAmount: Number(incomeSettings.dispose_amount) || 0,
    disposePeriod,
    trusteeCommRate,
    propertyItems: propertyItems.map((p) => ({
      detail: p.detail,
      category: p.category,
      amount: p.amount,
      isProtection: p.isProtection,
    })),
  });

  return {
    totalDebt,
    totalCapital,
    totalInterest,
    securedTotal,
    unsecuredTotal,
    unsecuredCapital,
    securedAttachment,
    netSalary,
    grossSalary,
    livingCost,
    monthlyAvailable,
    monthlyResult,
    liquidationValue,
    repayMonths,
    monthlyRepay: baseMonthlyRepay,
    totalRepayAmount: baseTotalRepay,
    repayRate,
    presentValueAmount: pv,
    isD5111,
    effectiveMonthlyRepay,
    effectiveTotalRepay,
    disposalAmount: Number(incomeSettings.dispose_amount) || 0,
    disposalInvestment,
    repayStartDate,
    repayEndDate,
    periodResult,
    repayType,
    periodSetting: periodSettingNum,
    liquidationGuaranteed: !isD5111,
    trusteeName,
    trusteeAccount,
    trusteeCommRate,
    incomeType,
    section10Clauses,
    section10Addendum,
    planCoreSections,
    // 핵심 숫자 해시 — 같은 snapshot에서 나온 PDF/CSV인지 검증
    snapshotHash: computeSnapshotHash({
      totalDebt, securedTotal, unsecuredTotal, unsecuredCapital,
      effectiveMonthlyRepay, effectiveTotalRepay, repayRate, liquidationValue,
      repayMonths, isD5111,
    }),
  };
}

/** 핵심 숫자들의 간단한 해시 (동일 입력 → 동일 해시) */
function computeSnapshotHash(values: Record<string, unknown>): string {
  const str = JSON.stringify(values);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return `snap_${(hash >>> 0).toString(36)}`;
}
