/**
 * 기준중위소득 데이터 (보건복지부 고시)
 *
 * 100% 기준 테이블을 단일 원본(source of truth)으로 두고,
 * 60% 등 파생값은 함수로 floor 계산합니다.
 *
 * 7인은 6인 + (6인−5인) 차분식으로 산출.
 *
 * P1-1 시점 변경 이력:
 * - 2024 100% 값 보정 (이전 60% 값이 다른 출처 기반이었음 — 보건복지부 고시 기준으로 교정)
 * - 2025/2026 round → floor 일관화 (1원 단위 차이 발생 가능)
 */

/** 가구원 수별 월 기준중위소득 100% (원) */
export const MEDIAN_INCOME_100: Record<number, Record<number, number>> = {
  2024: { 1: 2_228_445, 2: 3_682_609, 3: 4_714_657, 4: 5_729_913, 5: 6_695_735, 6: 7_618_369, 7: 8_540_825 },
  2025: { 1: 2_392_013, 2: 3_932_658, 3: 5_025_353, 4: 6_097_773, 5: 7_108_192, 6: 8_064_805, 7: 9_021_418 },
  2026: { 1: 2_564_238, 2: 4_199_292, 3: 5_359_036, 4: 6_494_738, 5: 7_556_719, 6: 8_555_952, 7: 9_555_185 },
};

/** 지원 연도 목록 (최신순) */
export const SUPPORTED_YEARS = Object.keys(MEDIAN_INCOME_100)
  .map(Number)
  .sort((a, b) => b - a);

/**
 * 가구원 수 기준 기준중위소득 100% 금액
 * @throws 연도 미등록 시
 */
export function getMedianIncome100(householdSize: number, year: number): number {
  const table = MEDIAN_INCOME_100[year];
  if (!table) {
    throw new Error(`기준중위소득 ${year}년 수치 미등록`);
  }
  const size = Math.max(1, Math.min(7, Math.floor(householdSize)));
  return table[size];
}

/**
 * 가구원 수 기준 기준중위소득 60% 금액 (floor)
 * @throws 연도 미등록 시
 */
export function getMedianIncome60(householdSize: number, year: number): number {
  return Math.floor(getMedianIncome100(householdSize, year) * 0.6);
}

// ─── 하위 호환 (기존 코드에서 사용 중) ─────────────────────────────

/**
 * @deprecated `getMedianIncome60(householdSize, year)` 사용 권장
 *
 * 부양가족 수 기반 호환 함수.
 * `dependentCount` = 본인 제외 부양가족 → householdSize = 1 + dependentCount
 */
export function getLivingCost(year: number, dependentCount: number): number {
  const householdSize = 1 + Math.max(0, dependentCount);
  return getMedianIncome60(householdSize, year);
}

/**
 * 가구 수 정보 요약
 */
export function getHouseholdSummary(
  totalFamilyCount: number,
  dependentCount: number,
  year: number,
) {
  const householdSize = 1 + dependentCount;
  const livingCost = getMedianIncome60(householdSize, year);

  return {
    totalFamilyCount,
    dependentCount,
    householdSize,
    livingCost,
    label: `${householdSize}인 가구`,
  };
}
