/**
 * 변제율 계산 (P1-3)
 *
 * colaw B_29 page 13 기준:
 *   변제율 = (확정+미확정 변제총액) / (확정+미확정 채권총액)
 *
 * 별제권부 담보 충당분은 분모·분자 모두에서 제외 (별제권으로 회수되는 부분).
 */

import type { CreditorRepaySchedule, RehabCreditor } from './types';
import { classifyCreditor } from './creditor-classification';

export interface RepaymentRateResult {
  rate: number;          // 0~1 비율
  ratePercent: number;   // 0~100 %
  numerator: number;     // 확정+미확정 변제총액
  denominator: number;   // 확정+미확정 채권총액
}

export function repaymentRate(
  schedules: CreditorRepaySchedule[],
  creditors: RehabCreditor[],
): RepaymentRateResult {
  const denominator = creditors.reduce((sum, c) => {
    const totalClaim = (c.capital || 0) + (c.interest || 0);
    const cls = classifyCreditor({
      totalClaim,
      isSecured: c.isSecured,
      securedCollateralValue: c.securedCollateralValue ?? 0,
      isOtherUnconfirmed: c.isOtherUnconfirmed ?? false,
    });
    return sum + cls.confirmedAmount + cls.unconfirmedAmount;
  }, 0);

  const numerator = schedules.reduce(
    (sum, s) => sum + (s.confirmedAmount ?? 0) + (s.unconfirmedAmount ?? 0),
    0,
  );

  const rate = denominator > 0 ? numerator / denominator : 0;
  return {
    rate,
    ratePercent: Math.round(rate * 1000) / 10, // 소수점 1자리
    numerator,
    denominator,
  };
}
