/**
 * 민법 정기금 라이프니츠 현가계수 테이블 (월 단위)
 *
 * 개인회생 변제계획안의 "(K) 총변제예정액" → "(L) 현재가치" 할인 계산에 사용.
 *
 * 초안 값 (colaw 역산 기준):
 * - 36개월 = 33.7702 (김한경 케이스: 561,457원 × 36개월 = 20,212,548원 →
 *   현재가치 18,961,470원. 18,961,470 ÷ 561,457 = 33.7702)
 *
 * TODO: 24/48/60개월 계수는 해당 기간 케이스 확보 후 보강
 */
export const LEIBNIZ_MONTHLY: Record<number, number> = {
  36: 33.7702,
};

export function getLeibnizCoefficient(months: number): number | null {
  return LEIBNIZ_MONTHLY[months] ?? null;
}

/** 월가용소득 × 계수 = 총변제액의 현재가치 */
export function discountByLeibniz(monthlyAvailable: number, months: number): number | null {
  const k = getLeibnizCoefficient(months);
  if (k == null) return null;
  return Math.round(monthlyAvailable * k);
}
