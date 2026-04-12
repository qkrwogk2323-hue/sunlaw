/**
 * 변제계획 계산기
 *
 * 채무 총액, 월 가용소득, 변제기간 옵션을 기반으로
 * 월 변제액, 변제율, 변제기간을 산출합니다.
 * 청산가치보장 원칙도 검증합니다.
 */

import type { RepaymentInput, RepaymentResult, SecuredAllocationResult } from './types';
import { discountByLeibniz } from './leibniz';

/** 개인회생 자격 한도 (담보부 15억, 무담보 10억) */
export const SECURED_LIMIT = 1_500_000_000;
export const UNSECURED_LIMIT = 1_000_000_000;

/**
 * 채무 총액 정보를 계산합니다.
 *
 * unsecuredCapital: 변제율 분모 (회생법원 양식 + colaw anatomy 기준)
 *   = 무담보 채권 원금 합계
 *   - 일반 무담보: 채권자 capital 전액
 *   - 별제권부: max(0, capital - secured_collateral_value) 부족분만
 *   - 이자 제외
 */
export function getDebtSummary(
  creditors: { capital: number; interest: number; isSecured: boolean; securedCollateralValue?: number }[],
  securedResults: SecuredAllocationResult[],
) {
  const totalCapital = creditors.reduce((s, c) => s + (c.capital || 0), 0);
  const totalInterest = creditors.reduce((s, c) => s + (c.interest || 0), 0);
  const totalDebt = totalCapital + totalInterest;

  let securedDebt: number;
  let unsecuredDebt: number;

  if (securedResults.length > 0) {
    securedDebt = securedResults.reduce((s, r) => s + r.securedRehabAmount, 0);
    unsecuredDebt = totalDebt - securedDebt;
  } else {
    securedDebt = creditors
      .filter(c => c.isSecured)
      .reduce((s, c) => s + (c.capital || 0) + (c.interest || 0), 0);
    unsecuredDebt = totalDebt - securedDebt;
  }

  // 회생법원 양식 변제율 분모: 무담보 원금 (이자 제외, 별제권 충당분 제외)
  const unsecuredCapital = creditors.reduce((s, c) => {
    const cap = c.capital || 0;
    if (c.isSecured) {
      const collateral = Math.min(c.securedCollateralValue ?? 0, cap);
      return s + Math.max(0, cap - collateral);
    }
    return s + cap;
  }, 0);

  return { totalDebt, totalCapital, totalInterest, securedDebt, unsecuredDebt, unsecuredCapital };
}

/**
 * 개인회생 자격 요건을 검증합니다.
 * 담보부 15억 이상 또는 무담보 10억 이상이면 대상 외입니다.
 */
export function checkEligibility(securedDebt: number, unsecuredDebt: number) {
  const securedExceeds = securedDebt >= SECURED_LIMIT;
  const unsecuredExceeds = unsecuredDebt >= UNSECURED_LIMIT;
  return {
    eligible: !securedExceeds && !unsecuredExceeds,
    securedExceeds,
    unsecuredExceeds,
  };
}

/**
 * 월 가용소득을 계산합니다.
 * 월 가용소득 = 월 소득 - 생계비 - 추가생계비 - 양육비 - 회생위원 보수
 */
export function calculateMonthlyAvailable(
  monthlyIncome: number,
  livingCost: number,
  extraLivingCost: number,
  childSupport: number,
  trusteeCommRate: number,
): number {
  const totalExpense = livingCost + extraLivingCost + childSupport;
  // ③ 월 가용소득 = ① 월소득 − ② 총생계비
  const preCommission = monthlyIncome - totalExpense;

  // ④ 회생위원 보수 = ③ × rate/100 (반올림) — CLAUDE.md 가용소득 공식
  if (trusteeCommRate > 0) {
    const commission = Math.round((preCommission * trusteeCommRate) / 100);
    return preCommission - commission;
  }

  return preCommission;
}

/**
 * 변제기간 옵션에 따라 변제개월 수와 목표 변제액을 결정합니다.
 */
function resolveRepayPeriod(
  input: RepaymentInput,
  totalDebt: number,
  totalCapital: number,
  monthlyAvailable: number,
): { repayMonths: number; targetAmount: number } {
  let repayMonths = 60;
  let targetAmount = totalDebt;

  switch (input.repayOption) {
    case 'capital36':
      // 2018년 이후 기본 정책: 원금만 36개월 변제 (anatomy 김한경 케이스)
      repayMonths = 36;
      targetAmount = totalCapital;
      break;

    case 'both36':
      // 원리금 36개월 변제
      repayMonths = 36;
      targetAmount = totalDebt;
      break;

    case 'capital60':
      // 2018 이전 5년 픽스 시대 잔재 (예외 케이스)
      repayMonths = 60;
      targetAmount = totalCapital;
      break;

    case 'both60':
      repayMonths = 60;
      targetAmount = totalDebt;
      break;

    case 'capital100_5y':
      repayMonths = Math.min(
        60,
        Math.max(36, Math.ceil(totalCapital / Math.max(monthlyAvailable, 1))),
      );
      targetAmount = input.extra5y ? totalDebt : totalCapital;
      break;

    case 'capital100_3y':
      repayMonths = Math.min(
        36,
        Math.ceil(totalCapital / Math.max(monthlyAvailable, 1)),
      );
      targetAmount = input.extra3y ? totalDebt : totalCapital;
      break;

    case 'full3y':
      repayMonths = 36;
      targetAmount = input.capitalOnly ? totalCapital : totalDebt;
      break;

    default:
      repayMonths = 60;
      targetAmount = totalDebt;
  }

  return { repayMonths, targetAmount };
}

/**
 * 변제계획을 계산합니다.
 *
 * @param input - 계산 입력 데이터
 * @returns 계산 결과 (월 가용소득이 0 이하이면 null)
 */
export function calculateRepayment(input: RepaymentInput): RepaymentResult | null {
  const { totalDebt, totalCapital, totalInterest, securedDebt, unsecuredDebt, unsecuredCapital } =
    getDebtSummary(input.creditors, input.securedResults);

  // 우선변제채권 총액 (법 §583, §614①: 100% 변제 필수)
  const priorityDebt = input.creditors
    .filter((c) => c.hasPriorityRepay)
    .reduce((s, c) => s + (c.capital || 0) + (c.interest || 0), 0);

  const monthlyAvailable = calculateMonthlyAvailable(
    input.monthlyIncome,
    input.livingCost,
    input.extraLivingCost,
    input.childSupport,
    input.trusteeCommRate,
  );

  if (monthlyAvailable <= 0) {
    return null;
  }

  const { repayMonths, targetAmount } = resolveRepayPeriod(
    input,
    totalDebt,
    totalCapital,
    monthlyAvailable,
  );

  // 우선변제 충분성 검증: 총 가용소득 < 우선변제 총액이면 경고
  const totalBudget = monthlyAvailable * repayMonths + input.disposeAmount;
  const priorityInsufficient = priorityDebt > 0 && totalBudget < priorityDebt;

  // 월 변제액 = min(월 가용소득, 목표액 / 변제개월)
  // 단, 우선변제채권이 있으면 최소한 우선변제 완납 가능한 수준 보장
  let monthlyRepay = Math.min(
    monthlyAvailable,
    Math.ceil(targetAmount / repayMonths),
  );

  // 우선변제채권 100% 보장: 월 변제액이 우선변제 완납에 부족하면 상향
  if (priorityDebt > 0 && !priorityInsufficient) {
    const minMonthlyForPriority = Math.ceil(priorityDebt / repayMonths);
    if (monthlyRepay < minMonthlyForPriority) {
      monthlyRepay = Math.min(monthlyAvailable, minMonthlyForPriority);
    }
  }

  // 청산가치보장 원칙 검증
  const totalRepayAmount = monthlyRepay * repayMonths + input.disposeAmount;
  let liquidationWarning = false;

  if (totalRepayAmount < input.liquidationValue) {
    liquidationWarning = true;
    monthlyRepay = Math.ceil(
      (input.liquidationValue - input.disposeAmount) / repayMonths,
    );
  }

  const finalTotalRepay = monthlyRepay * repayMonths + input.disposeAmount;
  // 변제율 분모: 무담보 원금 (회생법원 양식 + colaw anatomy 일치)
  // 0이면 totalCapital fallback
  const rateDenominator = unsecuredCapital > 0 ? unsecuredCapital : totalCapital;
  const repayRate = rateDenominator > 0
    ? (finalTotalRepay / rateDenominator) * 100
    : 0;

  return {
    monthlyAvailable,
    monthlyRepay,
    repayMonths,
    totalRepayAmount: finalTotalRepay,
    presentValue: discountByLeibniz(monthlyAvailable, repayMonths),
    repayRate,
    totalDebt,
    totalCapital,
    totalInterest,
    securedDebt,
    unsecuredDebt,
    liquidationWarning,
    priorityDebt,
    priorityInsufficient,
  };
}

/**
 * 변제기간을 재설정합니다.
 * 기존 계산 결과를 기반으로 새 기간에 맞는 월 변제액과 변제율을 재산출합니다.
 */
export function resetRepayPeriod(
  months: number,
  totalDebt: number,
  monthlyAvailable: number,
  disposeAmount: number,
): RepaymentResult {
  const monthlyRepay = Math.min(
    monthlyAvailable,
    Math.ceil(totalDebt / months),
  );
  const totalRepayAmount = monthlyRepay * months + disposeAmount;
  const repayRate = totalDebt > 0 ? (totalRepayAmount / totalDebt) * 100 : 0;

  return {
    monthlyAvailable,
    monthlyRepay,
    repayMonths: months,
    totalRepayAmount,
    presentValue: discountByLeibniz(monthlyAvailable, months),
    repayRate,
    totalDebt,
    totalCapital: 0,
    totalInterest: 0,
    securedDebt: 0,
    unsecuredDebt: 0,
    liquidationWarning: false,
    priorityDebt: 0,
    priorityInsufficient: false,
  };
}

/**
 * D5110 vs D5111 양식 판정 (가이드 p.5, CLAUDE.md)
 *
 * 현재가치(가용소득 총변제) > 청산가치 → D5110 (가용소득만)
 * 현재가치(가용소득 총변제) ≤ 청산가치 → D5111 (가용소득+재산처분)
 */
export function determineFormType(
  presentValue: number | null,
  liquidationValue: number,
): 'D5110' | 'D5111' {
  if (presentValue == null || presentValue <= liquidationValue) return 'D5111';
  return 'D5110';
}

/**
 * D5111 재산처분 변제투입예정액 계산 (가이드 p.17, CLAUDE.md §5-6)
 *
 * (O) = { (J)청산가치 - (L)현재가치 } × 승수  [올림]
 *   승수: 변제기한 1년이내 = 1.3, 2년이내 = 1.5
 *   외부 위원 시: 위 × 0.99 (1% 보수 차감, 소수점 반올림)
 *
 * @returns 실제 변제투입예정액 (O)
 */
export function calculateDisposalAmount(
  liquidationValue: number,
  presentValue: number,
  disposeDeadlineYears: 1 | 2,
  isExternalTrustee: boolean,
): number {
  const gap = Math.max(0, liquidationValue - presentValue);
  if (gap === 0) return 0;

  const multiplier = disposeDeadlineYears <= 1 ? 1.3 : 1.5;
  let amount = Math.ceil(gap * multiplier);

  if (isExternalTrustee) {
    const fee = Math.round(amount * 0.01);
    amount = amount - fee;
  }

  return amount;
}

/**
 * D5111 재산처분 채권자별 배분 (가이드 p.16)
 *
 * (P) = (O) × { (D)해당 채권 / (G)총 채권 }  [올림]
 */
export function allocateDisposalToCreditors(
  disposalAmount: number,
  creditors: { id: string; claim: number }[],
): { creditorId: string; amount: number }[] {
  const totalClaim = creditors.reduce((s, c) => s + c.claim, 0);
  if (totalClaim === 0 || disposalAmount === 0) {
    return creditors.map((c) => ({ creditorId: c.id, amount: 0 }));
  }

  let allocated = 0;
  return creditors.map((c, idx) => {
    let amount: number;
    if (idx === creditors.length - 1) {
      amount = disposalAmount - allocated;
    } else {
      amount = Math.ceil(disposalAmount * c.claim / totalClaim);
      allocated += amount;
    }
    return { creditorId: c.id, amount };
  });
}
