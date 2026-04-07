/**
 * 변제기간 자동결정 (P1-2)
 *
 * 채무자회생법 §611② / 콜로 관행:
 *   1) 36개월 기준으로 청산가치 보장 테스트 통과 → 36
 *   2) 36 실패 → 48 시도, 통과 → 48
 *   3) 48 실패 → 60 (최대)
 *   4) 60에서도 PV < 청산가치면 'cap_60' (청산가치 보장 위배 플래그)
 *
 * 청산가치 테스트: presentValue(monthlyPayment, period) >= liquidationValue
 */

import { presentValue } from './leibniz';

export type RepaymentPeriod = 36 | 48 | 60;

export interface PeriodDecisionInput {
  /** 가처분소득 월액 (= 월 가용소득) */
  monthlyPayment: number;
  /** 청산가치 (재산 합계 − 면제재산 등) */
  liquidationValue: number;
  /** 일반회생채권 총액 (별제권부 부족액 포함) */
  unsecuredTotal: number;
}

export type PeriodDecisionReason = 'minimum_36' | 'liquidation_test' | 'cap_60';

export interface PeriodDecisionResult {
  period: RepaymentPeriod;
  reason: PeriodDecisionReason;
  /** 결정된 기간에서의 현재가치 */
  pvAtPeriod: number;
  /** 변제율 = pv / unsecuredTotal */
  rateAtPeriod: number;
}

export function decideRepaymentPeriod(input: PeriodDecisionInput): PeriodDecisionResult {
  const periods: RepaymentPeriod[] = [36, 48, 60];

  for (const p of periods) {
    const pv = presentValue(input.monthlyPayment, p);
    if (pv >= input.liquidationValue) {
      return {
        period: p,
        reason: p === 36 ? 'minimum_36' : 'liquidation_test',
        pvAtPeriod: pv,
        rateAtPeriod: input.unsecuredTotal > 0 ? pv / input.unsecuredTotal : 0,
      };
    }
  }

  // 60개월로도 청산가치 보장 미달
  const pv60 = presentValue(input.monthlyPayment, 60);
  return {
    period: 60,
    reason: 'cap_60',
    pvAtPeriod: pv60,
    rateAtPeriod: input.unsecuredTotal > 0 ? pv60 / input.unsecuredTotal : 0,
  };
}
