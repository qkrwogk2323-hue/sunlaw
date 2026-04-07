/**
 * 기준중위소득 데이터 (2022~2026 보건복지부 고시)
 *
 * 출처:
 * - 2022: 고시 제2021-211호
 * - 2023: 고시 제2022-191호
 * - 2024: 고시 제2023-150호
 * - 2025: 2024 중앙생활보장위원회
 * - 2026: 2025 중앙생활보장위원회
 *
 * 8인 이상은 연도별 증분(`INCREMENT_PER_EXTRA`)을 이용해 산출.
 * 2022~2024 증분은 고시 원문 확인분, 2025/2026은 (7인−6인) 차분식.
 */

/** 가구원 수별 월 기준중위소득 100% (원, 1~7인) */
export const MEDIAN_INCOME_100: Record<number, Record<number, number>> = {
  2022: { 1: 1_944_812, 2: 3_260_085, 3: 4_194_701, 4: 5_121_080, 5: 6_024_515, 6: 6_907_004, 7: 7_780_592 },
  2023: { 1: 2_077_892, 2: 3_456_155, 3: 4_434_816, 4: 5_400_964, 5: 6_330_688, 6: 7_227_981, 7: 8_107_515 },
  2024: { 1: 2_228_445, 2: 3_682_609, 3: 4_714_657, 4: 5_729_913, 5: 6_695_735, 6: 7_618_369, 7: 8_514_994 },
  2025: { 1: 2_392_013, 2: 3_932_658, 3: 5_025_353, 4: 6_097_773, 5: 7_108_192, 6: 8_064_805, 7: 9_021_418 },
  2026: { 1: 2_564_238, 2: 4_199_292, 3: 5_359_036, 4: 6_494_738, 5: 7_556_719, 6: 8_555_952, 7: 9_555_185 },
};

/** 8인 이상 추가 1인당 증분 (원, 연도별) */
export const INCREMENT_PER_EXTRA: Record<number, number> = {
  2022: 873_588,
  2023: 879_534,
  2024: 896_625,
  2025: 956_613,
  2026: 999_233,
};

/** 지원 연도 목록 (최신순) */
export const SUPPORTED_YEARS = Object.keys(MEDIAN_INCOME_100)
  .map(Number)
  .sort((a, b) => b - a);

/**
 * 가구원 수 기준 기준중위소득 100% 금액
 *
 * - 1~7인: 고시 직접 조회
 * - 8인 이상: 7인 + 증분 × (가구원 − 7)
 * - 미등록 연도: 가장 최근 확정연도(2025) fallback
 */
export function getMedianIncome(householdSize: number, year: number): number {
  const table = MEDIAN_INCOME_100[year] ?? MEDIAN_INCOME_100[2025];
  const size = Math.max(1, Math.floor(householdSize));
  if (size <= 7) return table[size] ?? table[1];
  const inc = INCREMENT_PER_EXTRA[year] ?? INCREMENT_PER_EXTRA[2025];
  return table[7] + inc * (size - 7);
}

/**
 * 최저 생계비 (= 기준중위소득 60%, floor)
 */
export function minimumLivingCost(householdSize: number, year: number): number {
  return Math.floor(getMedianIncome(householdSize, year) * 0.6);
}

export interface AdjustLivingCostResult {
  adjusted: number;
  wasClamped: boolean;
  floor: number;
}

/**
 * @deprecated P1-1 호환용. 가능하면 `computeLivingCost` 사용.
 *
 * 입력 생계비를 최저 기준으로 자동 조정.
 *   - input >= floor: 그대로 사용
 *   - input <  floor: floor로 클램프, wasClamped=true
 */
export function adjustLivingCost(
  input: number,
  householdSize: number,
  year: number,
): AdjustLivingCostResult {
  const floor = minimumLivingCost(householdSize, year);
  if (input >= floor) return { adjusted: input, wasClamped: false, floor };
  return { adjusted: floor, wasClamped: true, floor };
}

// ─── P1-7: colaw 생계비 공식 (증액률 + 추가생계비) ────────────────

export interface LivingCostOptions {
  householdSize: number;
  year: number;
  /** colaw lowestlivingmoneyrate (%, 기본 100 = 60% 그대로) */
  rate?: number;
  /** colaw usingfamily_low_money (추가생계비) */
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
 * colaw 공식 기반 생계비 계산.
 *
 * lowMoney(=baseline60) × (rate/100) + 추가생계비
 *
 * 김한경 케이스(rate=150, baseline 1,538,542):
 *   afterRate = round(1,538,542 × 1.5) = 2,307,813
 *   ※ colaw의 lowMoney(1,025,695)는 별도 산출 기반이며, VS는 60% 테이블 직접 사용
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
