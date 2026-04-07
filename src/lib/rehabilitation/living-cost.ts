/**
 * 생계비 자동 조정 (P1-1)
 *
 * colaw 동작:
 *   사용자가 입력한 living_cost가 기준중위소득 60% 미만이면
 *   자동으로 기준치로 끌어올림. VS는 입력값을 그대로 사용했음.
 *
 * 본 모듈은 기존 median-income.ts (60% 값 테이블)를 floor로 사용한다.
 */

import { getMedianIncome60 } from './median-income';

export interface AdjustLivingCostResult {
  adjusted: number;
  wasClamped: boolean;
  floor: number;
}

/**
 * 가구원 수 기준 최저 생계비 (= 기준중위소득 60%)
 *
 * @param householdSize 본인 포함 가구원 수
 * @param year 기준 연도 (등록되지 않은 연도면 throw)
 * @throws 연도 미등록 시
 */
export function minimumLivingCost(householdSize: number, year = 2026): number {
  return getMedianIncome60(householdSize, year);
}

/**
 * 입력 생계비를 기준치로 자동 조정.
 *   - input >= floor: 그대로 사용
 *   - input <  floor: floor로 클램프, wasClamped=true
 */
export function adjustLivingCost(
  input: number,
  householdSize: number,
  year = 2026,
): AdjustLivingCostResult {
  const floor = minimumLivingCost(householdSize, year);
  if (input >= floor) {
    return { adjusted: input, wasClamped: false, floor };
  }
  return { adjusted: floor, wasClamped: true, floor };
}
