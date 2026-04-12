/**
 * 월가용소득 공식 확장 (P1-7)
 *
 * 처리지침 §7, 가이드 p.37 기반:
 *   월가용소득 = 월평균소득
 *              − 실적용생계비 (= baseline60 × rate/100 + extraFamilyLowMoney)
 *              − 양육비
 *              − 회생위원보수 (월소득 × 보수율/100)
 *
 * 김한경 케이스:
 *   monthlyIncome = 2,100,000
 *   householdSize = 1, year = 2026
 *   livingCostRate = 150% → afterRate = 1,538,543
 *   monthlyAvailable = 2,100,000 − 1,538,543 = 561,457
 */

import { computeLivingCost, type LivingCostResult } from './median-income';

export interface MonthlyAvailableInput {
  monthlyIncome: number;
  householdSize: number;
  year: number;
  /** 생계비율(처리지침 §7②), % 단위, 기본 100 */
  livingCostRate?: number;
  /** 추가생계비 (처리지침 §7②) */
  extraFamilyLowMoney?: number;
  /** 양육비 (월) */
  childSupport?: number;
  /** 회생위원 보수율, % 단위 */
  trusteeCommissionRate?: number;
}

export interface MonthlyAvailableResult {
  monthlyIncome: number;
  livingCost: LivingCostResult;
  childSupport: number;
  trusteeCommission: number;
  monthlyAvailable: number;
  warnings: string[];
}

export function computeMonthlyAvailable(input: MonthlyAvailableInput): MonthlyAvailableResult {
  const livingCost = computeLivingCost({
    householdSize: input.householdSize,
    year: input.year,
    rate: input.livingCostRate,
    extraFamilyLowMoney: input.extraFamilyLowMoney,
  });

  const childSupport = Math.max(0, Math.round(input.childSupport ?? 0));
  const commissionRate = input.trusteeCommissionRate ?? 0;

  // CLAUDE.md: ③ 월 가용소득 = ① 월소득 − ② 생계비 − 양육비
  // ④ 회생위원 보수 = ③ × commissionRate/100 (반올림)
  // ⑤ 월 실제 가용소득 = ③ − ④
  const preCommissionAvailable = input.monthlyIncome - livingCost.applied - childSupport;
  const trusteeCommission = commissionRate > 0
    ? Math.max(0, Math.round((preCommissionAvailable * commissionRate) / 100))
    : 0;

  const raw = preCommissionAvailable - trusteeCommission;
  const monthlyAvailable = Math.max(0, Math.floor(raw));

  const warnings: string[] = [];
  if (raw < 0) {
    warnings.push('월가용소득이 음수 — 공제 합계가 월소득을 초과합니다.');
  }
  const rate = input.livingCostRate ?? 100;
  if (rate < 100) {
    warnings.push('생계비율이 100% 미만 — 기준중위소득 60% 보장 위배 가능');
  }
  if (rate > 200) {
    warnings.push('생계비율이 200% 초과 — 법원 이례적 승인 필요');
  }

  return {
    monthlyIncome: input.monthlyIncome,
    livingCost,
    childSupport,
    trusteeCommission,
    monthlyAvailable,
    warnings,
  };
}
