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
 */
export function getDebtSummary(
  creditors: { capital: number; interest: number; isSecured: boolean }[],
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

  return { totalDebt, totalCapital, totalInterest, securedDebt, unsecuredDebt };
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
  let available = monthlyIncome - totalExpense;

  if (trusteeCommRate > 0) {
    available = Math.round(available * (1 - trusteeCommRate / 100));
  }

  return available;
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
  const { totalDebt, totalCapital, totalInterest, securedDebt, unsecuredDebt } =
    getDebtSummary(input.creditors, input.securedResults);

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

  // 월 변제액 = min(월 가용소득, 목표액 / 변제개월)
  let monthlyRepay = Math.min(
    monthlyAvailable,
    Math.ceil(targetAmount / repayMonths),
  );

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
  const repayRate = totalDebt > 0
    ? (finalTotalRepay / totalDebt) * 100
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
  };
}
