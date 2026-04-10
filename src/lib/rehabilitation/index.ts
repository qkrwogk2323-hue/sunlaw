/**
 * 개인회생 자동작성 모듈
 *
 * @module rehabilitation
 */

// 타입
export type * from './types';

// 기준중위소득
export {
  MEDIAN_INCOME_100,
  INCREMENT_PER_EXTRA,
  SUPPORTED_YEARS,
  getMedianIncome,
  minimumLivingCost,
  adjustLivingCost,
  computeLivingCost,
  getLivingCost,
  getHouseholdSummary,
} from './median-income';
export type { LivingCostOptions, LivingCostResult } from './median-income';

// P1-7 월가용소득 공식 확장
export { computeMonthlyAvailable } from './monthly-available';
export type { MonthlyAvailableInput, MonthlyAvailableResult } from './monthly-available';

// 별제권 배분
export { calculateSecuredAllocations, getSecuredAllocationTotals, getLiquidationValue, getDefaultValuationRate } from './secured-allocation';

// 재산 청산가치
export { PROPERTY_CATEGORIES, getCategoryDef, calculateCategorySubtotal, calculateLiquidationValue } from './property-valuation';

// 변제계획 계산
export { calculateRepayment, calculateMonthlyAvailable, getDebtSummary, checkEligibility, resetRepayPeriod, SECURED_LIMIT, UNSECURED_LIMIT } from './repayment-calculator';

// 변제기간 자동결정 (P1-2)
export { decideRepaymentPeriod } from './repayment-period';
export type { RepaymentPeriod, PeriodDecisionInput, PeriodDecisionResult, PeriodDecisionReason } from './repayment-period';

// 변제기간 6규칙 엔진 (P1-8)
export { decidePeriodSetting } from './period-setting';
export type { PeriodSetting, PeriodSettingInput, PeriodSettingResult, CreditorClaim } from './period-setting';

// 라운딩·보정·변제율 표기 (P1-9)
export { buildAdjustedSchedule, formatRepaymentRate } from './rounding';
export type { ScheduleAdjustmentInput, ScheduleAdjustmentResult, MonthlyPaymentRow } from './rounding';

// 라이프니츠 (P0-1)
export { LEIBNIZ_REHAB, presentValue } from './leibniz';

// 변제 스케줄
export { generateRepaySchedule, validateScheduleTotals } from './schedule-generator';

// 검증
export { validateResidentFront, validateResidentBack, formatPhoneNumber, formatMoney, parseMoney, validateDebtLimits, validateRepayMonths } from './validators';

// 금융기관
export { searchFinancialInstitution, getGroupedInstitutions, FINANCIAL_INSTITUTIONS, CATEGORY_LABELS } from './financial-institutions';

// D5101 재산목록 카테고리별 스키마
export { PROPERTY_DETAIL_SCHEMAS, validatePropertyDetail } from './property-schemas';
export type { PropertyCategoryKey } from './property-schemas';

// D5103 수입/지출 스키마
export { incomeBreakdownSchema, expenseBreakdownSchema, validateIncomeBreakdown, validateExpenseBreakdown, computeMonthlyAverageIncome, computeAdditionalExpenseRate, computeAnnualAmount } from './income-expense-schemas';

// D5108/D5109/D5110 법원 서식 스키마
export { d5108Schema, d5109Schema, d5110Schema, validateD5108, validateD5109, validateD5110 } from './court-form-schemas';
