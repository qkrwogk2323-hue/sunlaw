/**
 * D5108 / D5109 / D5110 법원 서식 Zod 스키마
 *
 * 법원서식 HWP 원본 기준 (docs/court-rules/법원서식_개인회생_정본/).
 * property-schemas.ts / income-expense-schemas.ts 패턴 준수.
 */
import { z } from 'zod';

// ─── D5108 개인회생재단에 속하지 않는 재산목록 ────────────────────
// 법 제580조③, 제383조①: 압류금지재산 등 회생재단에서 제외되는 재산
export const nonEstatePropertyItemSchema = z.object({
  seq: z.number().int().positive(),                   // 순번
  description: z.string().min(1, '재산 대상과 명칭 필수'), // 재산의 대상과 명칭
  location: z.string().optional(),                     // 소재지
  estimated_value: z.number().int().nonnegative(),     // 추정가액
  exemption_statute: z.string().optional(),            // 압류금지 근거 조문
  evidence_attached: z.boolean().default(false),       // 소명자료 첨부 여부
});

export const d5108Schema = z.object({
  case_year: z.number().int().optional(),
  case_number: z.string().optional(),
  applicant_name: z.string().optional(),
  items: z.array(nonEstatePropertyItemSchema),
  submission_date: z.string().optional(),              // YYYY-MM-DD
});

// ─── D5109 면제재산 결정신청서 ────────────────────────────────────
// 법 제383조②: 주거용 임차보증금 또는 6개월 생계비용 재산 면제 신청
export const d5109Schema = z.object({
  case_year: z.number().int().optional(),
  case_number: z.string().optional(),
  applicant_name: z.string().optional(),

  // 신청 유형
  type: z.enum(['housing_deposit', 'living_expense']),
  // type=housing_deposit: 주거용건물 임차보증금
  // type=living_expense: 6개월간 생계비 특정재산

  // 면제재산 금액
  exempt_amount: z.number().int().nonnegative(),

  // 주택임대차 (type=housing_deposit 시)
  lease_contract_date: z.string().optional(),
  lease_period_from: z.string().optional(),
  lease_period_to: z.string().optional(),
  lease_property_location: z.string().optional(),
  lease_deposit: z.number().int().nonnegative().optional(),
  lease_monthly_rent: z.number().int().nonnegative().optional(),
  lease_overdue_months: z.number().int().nonnegative().optional(),
  landlord_name: z.string().optional(),
  resident_registration_date: z.string().optional(),
  fixed_date: z.string().optional(),
  has_fixed_date: z.boolean().optional(),

  // 첨부서류
  attachments: z.array(z.string()).default([]),        // ['임대차계약서', '주민등록등본']
  submission_date: z.string().optional(),
});

// ─── D5110 변제계획안 (가용소득만) ────────────────────────────────
// 이미 rehabilitation_income_settings + creditors 캐시에 데이터 존재.
// 이 스키마는 HWP 문서 생성 시 바인딩할 필드를 정의.
export const d5110Schema = z.object({
  // 채무자 정보 (applications에서 가져옴)
  applicant_name: z.string(),
  case_year: z.number().int().optional(),
  case_number: z.string().optional(),
  court_name: z.string().optional(),

  // 변제 요약
  repayment_start_date: z.string(),                    // YYYY-MM-DD
  repayment_method: z.enum(['매월', '격월', '분기']).default('매월'),
  repay_months: z.number().int().min(36).max(60),
  monthly_repay_amount: z.number().int().nonnegative(),
  total_repay_amount: z.number().int().nonnegative(),
  repay_rate: z.number().nonnegative(),                // % (예: 12.34)

  // 가용소득 산출 근거
  monthly_income: z.number().int().nonnegative(),
  living_cost: z.number().int().nonnegative(),
  extra_living_cost: z.number().int().nonnegative().default(0),
  child_support: z.number().int().nonnegative().default(0),
  trustee_commission: z.number().int().nonnegative().default(0),
  monthly_available: z.number().int().nonnegative(),

  // 청산가치
  liquidation_value: z.number().int().nonnegative(),
  liquidation_guaranteed: z.boolean(),

  // 채무 요약
  total_debt: z.number().int().nonnegative(),
  secured_debt: z.number().int().nonnegative(),
  unsecured_debt: z.number().int().nonnegative(),

  // 납부 정보
  trustee_name: z.string().optional(),
  trustee_account: z.string().optional(),

  // 채권자별 변제 스케줄 (D5111 별지 — 앱 계산)
  creditor_schedule: z.array(z.object({
    bond_number: z.number().int(),
    creditor_name: z.string(),
    total_claim: z.number().int().nonnegative(),       // 확정채권액
    repay_ratio: z.number().nonnegative(),             // 변제비율 %
    monthly_amount: z.number().int().nonnegative(),
    total_amount: z.number().int().nonnegative(),
  })).optional(),
});

// ─── 검증 함수 ───────────────────────────────────────────────────
export function validateD5108(data: unknown) {
  const r = d5108Schema.safeParse(data);
  return r.success ? { ok: true as const, data: r.data } : { ok: false as const, error: r.error.issues.map(i => i.message).join(', ') };
}

export function validateD5109(data: unknown) {
  const r = d5109Schema.safeParse(data);
  return r.success ? { ok: true as const, data: r.data } : { ok: false as const, error: r.error.issues.map(i => i.message).join(', ') };
}

export function validateD5110(data: unknown) {
  const r = d5110Schema.safeParse(data);
  return r.success ? { ok: true as const, data: r.data } : { ok: false as const, error: r.error.issues.map(i => i.message).join(', ') };
}
