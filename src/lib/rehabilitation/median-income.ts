/**
 * 기준중위소득의 100분의 60 데이터
 * - 가구 수별 월 생계비 기준표
 * - 출처: 보건복지부 고시
 */

/** [1인, 2인, 3인, 4인, 5인, 6인] 가구 기준 */
export const MEDIAN_INCOME_60: Record<number, number[]> = {
  2026: [1_538_543, 2_519_575, 3_215_422, 3_896_843, 4_534_031, 5_133_571],
  2025: [1_435_208, 2_359_595, 3_015_212, 3_658_664, 4_264_915, 4_838_883],
  2024: [1_337_067, 2_192_584, 2_798_953, 3_392_436, 3_947_805, 4_475_320],
};

/** 지원 연도 목록 */
export const SUPPORTED_YEARS = Object.keys(MEDIAN_INCOME_60)
  .map(Number)
  .sort((a, b) => b - a);

/**
 * 가구 수에 해당하는 기준중위소득 60% 금액을 반환합니다.
 *
 * @param year - 기준 연도 (2024~2026)
 * @param dependentCount - 부양가족 수 (본인 제외)
 * @returns 월 생계비 금액 (원)
 */
export function getLivingCost(year: number, dependentCount: number): number {
  const data = MEDIAN_INCOME_60[year] ?? MEDIAN_INCOME_60[2026];
  const householdSize = 1 + Math.max(0, dependentCount);
  const idx = Math.min(householdSize, 6) - 1;
  return data[idx];
}

/**
 * 가구 수 정보를 요약합니다.
 *
 * @param totalFamilyCount - 전체 가족 수 (본인 포함)
 * @param dependentCount - 부양가족 수
 * @param year - 기준 연도
 */
export function getHouseholdSummary(
  totalFamilyCount: number,
  dependentCount: number,
  year: number,
) {
  const householdSize = 1 + dependentCount;
  const livingCost = getLivingCost(year, dependentCount);

  return {
    totalFamilyCount,
    dependentCount,
    householdSize,
    livingCost,
    label: `${householdSize}인 가구`,
  };
}
