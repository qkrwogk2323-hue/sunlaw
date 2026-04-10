/**
 * D5103 수입 및 지출에 관한 목록 — Zod 스키마
 *
 * rehabilitation_income_settings.income_breakdown / expense_breakdown jsonb의 타입 정의.
 * 법원 양식(D5103) I항(수입 명목별) + II항(지출 항목별)을 구조화.
 */
import { z } from 'zod';

// ─── I. 수입 항목 ────────────────────────────────────────────────
// 법원 양식: 명목 / 기간구분 / 금액 / 연간환산 / 압류유무
export const incomeItemSchema = z.object({
  label: z.string().min(1, '수입 명목 필수'),       // 급여, 상여, 연금, 사업소득, 임대소득, 기타
  period_type: z.enum(['월', '분기', '반기', '연']).default('월'),  // 기간 구분
  amount: z.number().int().nonnegative(),            // 해당 기간 금액
  annual_amount: z.number().int().nonnegative(),     // 연간 환산 금액
  has_seizure: z.boolean().default(false),           // 압류/가압류 유무
  seizure_detail: z.string().optional(),             // 압류 상세 (법원, 사건번호, 금액)
});

export const incomeBreakdownSchema = z.array(incomeItemSchema);

// ─── II. 지출 항목 (60% 초과 시) ─────────────────────────────────
// 법원 양식: 비목 / 지출예상 생계비 / 추가지출사유
export const expenseItemSchema = z.object({
  category: z.enum(['생계비', '주거비', '의료비', '교육비', '기타']),
  amount: z.number().int().nonnegative(),
  additional_reason: z.string().optional(),          // 추가 지출 사유
});

export const expenseBreakdownSchema = z.array(expenseItemSchema);

// ─── 검증 함수 ───────────────────────────────────────────────────
export function validateIncomeBreakdown(data: unknown) {
  const result = incomeBreakdownSchema.safeParse(data);
  if (!result.success) return { ok: false as const, error: result.error.issues.map(i => i.message).join(', ') };
  return { ok: true as const, data: result.data };
}

export function validateExpenseBreakdown(data: unknown) {
  const result = expenseBreakdownSchema.safeParse(data);
  if (!result.success) return { ok: false as const, error: result.error.issues.map(i => i.message).join(', ') };
  return { ok: true as const, data: result.data };
}

// ─── 월 평균 수입 계산 (연간환산 합계 / 12) ──────────────────────
export function computeMonthlyAverageIncome(items: z.infer<typeof incomeBreakdownSchema>): number {
  const totalAnnual = items.reduce((s, i) => s + i.annual_amount, 0);
  return Math.ceil(totalAnnual / 12); // 소수점 이하 올림 (법원 양식 지시)
}

// ─── 추가 비율 계산 (법원 양식 II항) ─────────────────────────────
export function computeAdditionalExpenseRate(
  expenses: z.infer<typeof expenseBreakdownSchema>,
  baselineLivingCost: number,
): number {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  if (baselineLivingCost <= 0) return 0;
  return Math.round(((total - baselineLivingCost) / baselineLivingCost) * 100);
}
