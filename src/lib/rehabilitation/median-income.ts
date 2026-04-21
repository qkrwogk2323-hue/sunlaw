/**
 * 기준중위소득 계산 함수 (처리지침 §7②, 가이드 p.37)
 *
 * 데이터 테이블은 `rules/median-income-tables.ts`에 분리.
 * 연도 추가 시 rules/ 파일만 수정하면 됨.
 */
import {
  MEDIAN_INCOME_100,
  MEDIAN_INCOME_60,
  INCREMENT_PER_EXTRA,
  FALLBACK_YEAR,
  SUPPORTED_YEARS,
} from './rules/median-income-tables';

// re-export for backward compatibility
export { MEDIAN_INCOME_100, MEDIAN_INCOME_60, INCREMENT_PER_EXTRA, SUPPORTED_YEARS };

/**
 * 가구원 수 기준 기준중위소득 100% 금액
 *
 * - 1~7인: 고시 직접 조회
 * - 8인 이상: 7인 + 증분 × (가구원 − 7)
 * - 미등록 연도: 가장 최근 확정연도(2025) fallback
 */
export function getMedianIncome(householdSize: number, year: number): number {
  const table = MEDIAN_INCOME_100[year] ?? MEDIAN_INCOME_100[FALLBACK_YEAR];
  const size = Math.max(1, Math.floor(householdSize));
  if (size <= 7) return table[size] ?? table[1];
  const inc = INCREMENT_PER_EXTRA[year] ?? INCREMENT_PER_EXTRA[FALLBACK_YEAR];
  return table[7] + inc * (size - 7);
}

/**
 * 권장 생계비 (= 기준중위소득 × rate%)
 *
 * @param householdSize 가구원 수
 * @param year 기준연도
 * @param rate 적용 비율(%) — 기본 60 (회생법원 권장선).
 *             50/55/65 등 사건별 조정 가능. 100은 중위소득 100% 자체.
 *
 * 검사관 2026-04-08 보고서 B-3:
 *   60%는 권장선이지 절대 하한이 아님. 법원은 60% 미만 인정 / 60% 초과 모두 수용.
 *   본 함수는 rate 기본값만 60으로 두고, 호출자가 사건별 조정 가능.
 */
export function minimumLivingCost(householdSize: number, year: number, rate = 60): number {
  const size = Math.max(1, Math.floor(householdSize));
  // rate=60이고 1~7인이면 보건복지부 공표 고정값 사용 (Math.floor 오차 방지)
  if (rate === 60 && size <= 7) {
    const table60 = MEDIAN_INCOME_60[year] ?? MEDIAN_INCOME_60[FALLBACK_YEAR];
    if (table60[size] != null) return table60[size];
  }
  return Math.floor((getMedianIncome(householdSize, year) * rate) / 100);
}

export interface AdjustLivingCostResult {
  adjusted: number;
  /** 입력값이 권장선 미만인 경우 true (UP-clamp 하지 않음, 경고용 플래그) */
  belowRecommendedFloor: boolean;
  /** 권장선 (rate 적용 후) */
  floor: number;
  /** @deprecated UP-clamp 제거됨. belowRecommendedFloor 사용 권장. */
  wasClamped: false;
}

/**
 * 입력 생계비 검사 — 권장선 미만 여부만 플래그로 반환.
 * 검사관 2026-04-08 보고서 B-3 #2: UP-clamp 제거. 사용자 입력 그대로 보존.
 *
 * @param input 사용자 입력 생계비 (원)
 * @param householdSize 가구원 수
 * @param year 기준연도
 * @param rate 권장선 비율 (기본 60)
 */
export function adjustLivingCost(
  input: number,
  householdSize: number,
  year: number,
  rate = 60,
): AdjustLivingCostResult {
  const floor = minimumLivingCost(householdSize, year, rate);
  return {
    adjusted: input,
    belowRecommendedFloor: input < floor,
    floor,
    wasClamped: false,
  };
}

// ─── P1-7: 생계비 공식(처리지침 §7②, 가이드 p.37) (증액률 + 추가생계비) ───

export interface LivingCostOptions {
  householdSize: number;
  year: number;
  /** 생계비율(처리지침 §7②) (%, 기본 100 = 60% 그대로) */
  rate?: number;
  /** 추가생계비 (처리지침 §7②) */
  extraFamilyLowMoney?: number;
}

export interface LivingCostResult {
  /** 기준중위소득 60% (최저 클램프 기준) */
  baseline60: number;
  /** baseline60 × rate / 100 */
  afterRate: number;
  /** afterRate + extraFamilyLowMoney (실적용 생계비) */
  applied: number;
  rate: number;
  extraFamilyLowMoney: number;
}

/**
 * 생계비 공식(처리지침 §7②, 가이드 p.37) 기반 생계비 계산.
 *
 * lowMoney(=baseline60) × (rate/100) + 추가생계비
 *
 * 김한경 케이스(rate=150, baseline 1,538,542):
 *   afterRate = round(1,538,542 × 1.5) = 2,307,813
 *   ※ VS는 보건복지부 고시 60% 테이블을 직접 사용
 */
export function computeLivingCost(opts: LivingCostOptions): LivingCostResult {
  const baseline60 = minimumLivingCost(opts.householdSize, opts.year);
  const rate = opts.rate ?? 100;
  const afterRate = Math.round((baseline60 * rate) / 100);
  const extra = Math.max(0, Math.round(opts.extraFamilyLowMoney ?? 0));
  return {
    baseline60,
    afterRate,
    applied: afterRate + extra,
    rate,
    extraFamilyLowMoney: extra,
  };
}

// ─── 하위 호환 ─────────────────────────────────────────────────────

/**
 * @deprecated `minimumLivingCost(householdSize, year)` 사용 권장
 *
 * 부양가족 수 기반 호환 함수.
 * `dependentCount` = 본인 제외 부양가족 → householdSize = 1 + dependentCount
 */
export function getLivingCost(year: number, dependentCount: number): number {
  const householdSize = 1 + Math.max(0, dependentCount);
  return minimumLivingCost(householdSize, year);
}

/**
 * 가구 수 정보 요약 (하위 호환)
 */
export function getHouseholdSummary(
  totalFamilyCount: number,
  dependentCount: number,
  year: number,
) {
  const householdSize = 1 + dependentCount;
  const livingCost = minimumLivingCost(householdSize, year);

  return {
    totalFamilyCount,
    dependentCount,
    householdSize,
    livingCost,
    label: `${householdSize}인 가구`,
  };
}
