/**
 * 개인회생 현가계수 (월 5/12% 복리, n-3개월 라이프니츠 + 3 공식)
 *
 * 근거:
 * - 민법 §379 법정이율 연 5%
 * - 법원 개인회생 실무 관행 (콜로/Clipsoft 동일)
 * - leibniz(n) = (1 - (1 + 5/1200)^-n) / (5/1200)
 * - 회생현가계수(n) = leibniz(n - 3) + 3
 *
 * 값은 공표 4자리 표값을 그대로 사용. 곱셈 후 원 미만 '버림' (가이드 p.13).
 *
 * 검증:
 *   leib(33) = 30.77199539... → +3 = 33.7719
 *   leib(45) = 40.95554... → +3 = 43.9555
 *   leib(57) = 50.64333655... → +3 = 53.6433
 */

export const LEIBNIZ_REHAB: Record<number, number> = {
  36: 33.7719,
  48: 43.9555,
  60: 53.6433,
};

/**
 * 월변제금 × 현가계수 → 현재가치 (원 미만 버림, 가이드 p.13)
 *
 * 갑OO 검증:
 *   309,631 × 33.7719 = 10,456,856.9... → 10,456,856 (버림)
 */
export function presentValue(monthlyPayment: number, months: 36 | 48 | 60): number {
  const factor = LEIBNIZ_REHAB[months];
  if (!factor) throw new Error(`지원되지 않는 변제개월: ${months}`);
  return Math.floor(monthlyPayment * factor);
}

// ─── 하위 호환 ─────────────────────────────────────────────────────

/** @deprecated `LEIBNIZ_REHAB` 사용 권장 */
export const LEIBNIZ_MONTHLY = LEIBNIZ_REHAB;

/** @deprecated `presentValue` 사용 권장 */
export function getLeibnizCoefficient(months: number): number | null {
  return LEIBNIZ_REHAB[months] ?? null;
}

/** @deprecated `presentValue(monthly, months)` 사용 권장 */
export function discountByLeibniz(monthlyAvailable: number, months: number): number | null {
  const k = LEIBNIZ_REHAB[months];
  if (k == null) return null;
  return Math.floor(monthlyAvailable * k);
}
