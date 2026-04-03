/**
 * 채권자별 변제 스케줄 생성기
 *
 * 총 변제액을 채권자별 채무 비율에 따라 배분합니다.
 * - sequential (원리금변제): 원금 먼저 변제 후 이자 변제
 * - combined (원리금합산변제): 원금과 이자를 비율대로 동시 변제
 */

import type { RehabCreditor, RepayType, CreditorRepaySchedule } from './types';

/**
 * 채권자별 변제 스케줄을 생성합니다.
 *
 * 마지막 채권자에게 반올림 오차를 보정하여
 * 합계가 정확히 일치하도록 합니다.
 *
 * @param creditors - 채권자 목록
 * @param monthlyRepay - 월 변제액
 * @param repayMonths - 변제기간 (개월)
 * @param disposeAmount - 처분재산 변제투입액
 * @param repayType - 변제 유형 (sequential | combined)
 * @returns 채권자별 변제 스케줄
 */
export function generateRepaySchedule(
  creditors: RehabCreditor[],
  monthlyRepay: number,
  repayMonths: number,
  disposeAmount: number,
  repayType: RepayType,
): CreditorRepaySchedule[] {
  if (creditors.length === 0 || monthlyRepay <= 0) return [];

  const totalDebt = creditors.reduce(
    (s, c) => s + (c.capital || 0) + (c.interest || 0),
    0,
  );
  const totalRepayTarget = monthlyRepay * repayMonths + disposeAmount;

  // 반올림 오차 보정을 위한 누적 방식
  let monthlyAllocated = 0;
  let totalAllocated = 0;

  return creditors.map((creditor, idx) => {
    const creditorDebt = (creditor.capital || 0) + (creditor.interest || 0);
    const ratio = totalDebt > 0 ? creditorDebt / totalDebt : 0;

    let monthly: number;
    let total: number;

    if (idx === creditors.length - 1) {
      // 마지막 채권자: 잔여분 배분 (반올림 오차 보정)
      monthly = monthlyRepay - monthlyAllocated;
      total = totalRepayTarget - totalAllocated;
    } else {
      monthly = Math.round(monthlyRepay * ratio);
      total = Math.round(totalRepayTarget * ratio);
      monthlyAllocated += monthly;
      totalAllocated += total;
    }

    let capitalRepay: number;
    let interestRepay: number;

    if (repayType === 'sequential') {
      // 원리금변제: 원금 먼저, 잔여분이 이자
      capitalRepay = Math.min(creditor.capital || 0, total);
      interestRepay = Math.max(0, total - (creditor.capital || 0));
    } else {
      // 원리금합산변제: 비율대로
      const capRatio = creditorDebt > 0
        ? (creditor.capital || 0) / creditorDebt
        : 0;
      capitalRepay = Math.round(total * capRatio);
      interestRepay = total - capitalRepay;
    }

    return {
      creditorId: creditor.id,
      ratio,
      monthlyAmount: monthly,
      totalAmount: total,
      capitalRepay,
      interestRepay,
    };
  });
}

/**
 * 스케줄 합계를 검증합니다.
 * 개별 배분액의 합이 총 변제액과 일치하는지 확인합니다.
 */
export function validateScheduleTotals(
  schedules: CreditorRepaySchedule[],
  expectedMonthly: number,
  expectedTotal: number,
): { monthlyValid: boolean; totalValid: boolean } {
  const actualMonthly = schedules.reduce((s, c) => s + c.monthlyAmount, 0);
  const actualTotal = schedules.reduce((s, c) => s + c.totalAmount, 0);

  return {
    monthlyValid: actualMonthly === expectedMonthly,
    totalValid: actualTotal === expectedTotal,
  };
}
