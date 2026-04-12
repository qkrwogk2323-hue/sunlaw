/**
 * 라운딩 + 마지막달 보정 (P1-9)
 *
 * 가이드 p.12 라운딩 관행 (김한경 검증):
 *   1) basePayment = floor(monthlyAvailable)
 *   2) totalTarget = 정책별 목표값 (없으면 basePayment × months)
 *   3) diff = totalTarget − basePayment × months
 *   4) 첫 12회차 base, 13회차부터 ceil(diff/(months−12))씩 가산
 *   5) 끝 회차에서 잔여 1~3원 흡수
 *
 * 김한경 36개월 검증:
 *   monthlyAvailable=561,457 / target=20,212,548
 *   basePayment=561,457 / diff=96
 *   adjustmentStartIndex=13 / perAdjustment=ceil(96/24)=4
 *   1~12회차: 561,457 / 13~36회차: 561,461
 *   합계: 561,457×12 + 561,461×24 = 6,737,484 + 13,475,064 = 20,212,548 ✓
 */

export interface ScheduleAdjustmentInput {
  /** 가용소득 (floor 적용 전, 또는 후 — 함수 내부에서 floor 보장) */
  monthlyAvailable: number;
  months: number;
  /** 목표 총변제액. 미지정 시 basePayment × months 그대로 */
  totalTarget?: number;
}

export interface MonthlyPaymentRow {
  /** 1-based 회차 인덱스 */
  index: number;
  amount: number;
}

export interface ScheduleAdjustmentResult {
  basePayment: number;
  rows: MonthlyPaymentRow[];
  total: number;
  /** target − basePayment × months */
  diff: number;
  /** 보정 시작 회차 (1-based, 보통 13) */
  adjustmentStartIndex: number;
  /** 회차당 가산 금액 */
  perAdjustment: number;
}

export function buildAdjustedSchedule(
  input: ScheduleAdjustmentInput,
): ScheduleAdjustmentResult {
  const months = input.months;
  const basePayment = Math.floor(input.monthlyAvailable);
  const target = input.totalTarget ?? basePayment * months;
  const diff = target - basePayment * months;

  const rows: MonthlyPaymentRow[] = [];

  if (diff === 0) {
    for (let i = 1; i <= months; i++) rows.push({ index: i, amount: basePayment });
    return {
      basePayment,
      rows,
      total: basePayment * months,
      diff: 0,
      adjustmentStartIndex: months + 1,
      perAdjustment: 0,
    };
  }

  // 첫 12회차 base, 13회차부터 가산 (months ≤ 12면 마지막달 흡수)
  const adjustmentStartIndex = months > 12 ? 13 : months;
  const adjustmentMonths = months - (adjustmentStartIndex - 1);
  const perAdjustment =
    adjustmentMonths > 0 ? Math.ceil(diff / adjustmentMonths) : 0;

  let remainingDiff = diff;
  for (let i = 1; i <= months; i++) {
    if (i < adjustmentStartIndex || perAdjustment === 0) {
      rows.push({ index: i, amount: basePayment });
      continue;
    }
    const add = Math.min(perAdjustment, remainingDiff);
    rows.push({ index: i, amount: basePayment + add });
    remainingDiff -= add;
  }

  // 마지막 회차에서 잔여 흡수 (음수 가능: perAdjustment 올림 차이)
  if (remainingDiff !== 0) {
    rows[rows.length - 1].amount += remainingDiff;
    remainingDiff = 0;
  }

  const total = rows.reduce((s, r) => s + r.amount, 0);
  return {
    basePayment,
    rows,
    total,
    diff,
    adjustmentStartIndex,
    perAdjustment,
  };
}

// ─── 변제율 표기 자리수 (가이드 §2 변제율) ───

/**
 * 변제율 포맷팅
 *
 * @param rate 0~1 비율
 * @param digits 소수 자리수 (0=정수%, 1=한자리%)
 * @returns "39%" 또는 "38.7%"
 */
export function formatRepaymentRate(rate: number, digits: 0 | 1 = 0): string {
  return (rate * 100).toFixed(digits) + '%';
}
