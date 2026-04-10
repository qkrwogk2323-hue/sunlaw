/**
 * D5101 재산목록 카테고리별 Zod 스키마
 *
 * rehabilitation_properties.structured_detail jsonb의 카테고리별 타입 정의.
 * 법원 양식(D5101)의 각 항목이 요구하는 서브필드를 구조화.
 */
import { z } from 'zod';

// ─── 현금 ─────────────────────────────────────────────────────────
export const cashDetailSchema = z.object({
  note: z.string().optional(),                    // 비고
});

// ─── 예금 ─────────────────────────────────────────────────────────
export const depositDetailSchema = z.object({
  bank_name: z.string().min(1, '금융기관명 필수'),  // 금융기관명
  account_number: z.string().optional(),            // 계좌번호
  balance: z.number().int().nonnegative(),          // 잔고
  deposit_type: z.string().optional(),              // 예금 종류 (정기/적금/부금 등)
});

// ─── 보험 ─────────────────────────────────────────────────────────
export const insuranceDetailSchema = z.object({
  company_name: z.string().min(1, '보험회사명 필수'),
  policy_number: z.string().optional(),             // 증권번호
  surrender_value: z.number().int().nonnegative(),  // 해약반환금
});

// ─── 자동차 ───────────────────────────────────────────────────────
export const vehicleDetailSchema = z.object({
  model: z.string().optional(),                     // 차종
  year: z.number().int().optional(),                // 연식
  registration_number: z.string().optional(),       // 등록번호
  market_value: z.number().int().nonnegative(),     // 시가
});

// ─── 임차보증금 ───────────────────────────────────────────────────
export const leaseDepositDetailSchema = z.object({
  property_description: z.string().optional(),      // 임차물건
  deposit_amount: z.number().int().nonnegative(),   // 보증금
  monthly_rent: z.number().int().nonnegative().optional(), // 월세
  refundable_amount: z.number().int().nonnegative(), // 반환받을 금액
  difference_reason: z.string().optional(),          // 차이 나는 사유
});

// ─── 부동산 ───────────────────────────────────────────────────────
export const realEstateDetailSchema = z.object({
  location: z.string().min(1, '소재지 필수'),       // 소재지, 면적
  area_sqm: z.number().nonnegative().optional(),    // 면적 (m²)
  property_kind: z.enum(['토지', '건물', '집합건물']).optional(), // 부동산 종류
  rights_type: z.string().optional(),               // 권리의 종류
  estimated_value: z.number().int().nonnegative(),  // 환가예상액
  lien_type: z.string().optional(),                 // 담보 종류 (근저당/질권 등)
  lien_amount: z.number().int().nonnegative().optional(), // 피담보채무액
});

// ─── 사업용 설비/재고/비품 ────────────────────────────────────────
export const fixturesDetailSchema = z.object({
  item_name: z.string().optional(),                 // 품목
  quantity: z.number().int().nonnegative().optional(), // 개수
  purchase_date: z.string().optional(),             // 구입 시기
  valuation: z.number().int().nonnegative(),        // 평가액
});

// ─── 대여금 채권 ──────────────────────────────────────────────────
export const loanReceivableDetailSchema = z.object({
  debtor_name: z.string().optional(),               // 상대방 채무자
  current_amount: z.number().int().nonnegative(),   // 현재액
  has_evidence: z.boolean().optional(),             // 소명자료 별첨
  difficulty_reason: z.string().optional(),         // 변제 곤란 사유
});

// ─── 매출금 채권 ──────────────────────────────────────────────────
export const salesReceivableDetailSchema = z.object({
  debtor_name: z.string().optional(),
  current_amount: z.number().int().nonnegative(),
  has_evidence: z.boolean().optional(),
  difficulty_reason: z.string().optional(),
});

// ─── 예상 퇴직금 ──────────────────────────────────────────────────
export const retirementDetailSchema = z.object({
  employer_name: z.string().optional(),             // 근무처
  gross_amount: z.number().int().nonnegative(),     // 퇴직금 총액
  exempt_amount: z.number().int().nonnegative().optional(), // 압류 불가 금액
  net_amount: z.number().int().nonnegative(),       // 순 퇴직금 (총액 - 압류불가)
});

// ─── 기타 ─────────────────────────────────────────────────────────
export const etcDetailSchema = z.object({
  description: z.string().optional(),
});

// ─── 카테고리 → 스키마 매핑 ───────────────────────────────────────
// DB PropertyCategoryId 키에 맞춤 (car, lease, realestate, equipment, loan, sales)
export const PROPERTY_DETAIL_SCHEMAS = {
  cash: cashDetailSchema,
  deposit: depositDetailSchema,
  insurance: insuranceDetailSchema,
  car: vehicleDetailSchema,
  lease: leaseDepositDetailSchema,
  realestate: realEstateDetailSchema,
  equipment: fixturesDetailSchema,
  loan: loanReceivableDetailSchema,
  sales: salesReceivableDetailSchema,
  retirement: retirementDetailSchema,
  seizure: etcDetailSchema,
  consignment: etcDetailSchema,
  etc: etcDetailSchema,
  exempt_housing: etcDetailSchema,
  exempt_living: etcDetailSchema,
} as const;

export type PropertyCategoryKey = keyof typeof PROPERTY_DETAIL_SCHEMAS;

/** structured_detail을 카테고리에 맞게 검증 */
export function validatePropertyDetail(category: string, detail: unknown) {
  const schema = PROPERTY_DETAIL_SCHEMAS[category as PropertyCategoryKey];
  if (!schema) return { ok: false as const, error: `알 수 없는 카테고리: ${category}` };
  const result = schema.safeParse(detail);
  if (!result.success) return { ok: false as const, error: result.error.issues.map(i => i.message).join(', ') };
  return { ok: true as const, data: result.data };
}
