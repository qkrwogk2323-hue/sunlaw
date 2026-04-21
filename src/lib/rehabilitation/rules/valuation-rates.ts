/**
 * 별제권 담보 환가비율 기본값 (가이드 §5, 법원 실무)
 *
 * 출처: REHABILITATION_LAW_RULES.md §6-1, 법원 작성례·실무준칙.
 * 법원별로 실무 차이가 있을 수 있으나, 아래는 일반적 기본값.
 *
 * 사용자가 사건별로 변경 가능 — 이 값은 디폴트로만 제공.
 */
export const DEFAULT_VALUATION_RATES: Record<string, number> = {
  '부동산': 70,
  '자동차': 50,
  '임차보증금': 100,
  '예금': 100,
  '보험': 100,
  '설비': 70,
  '채권': 70,
  '기타': 70,
};

export const FALLBACK_VALUATION_RATE = 70;

export function getDefaultValuationRate(propertyType: string): number {
  return DEFAULT_VALUATION_RATES[propertyType] ?? FALLBACK_VALUATION_RATE;
}
