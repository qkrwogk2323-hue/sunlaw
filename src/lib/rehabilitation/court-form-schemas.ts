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

// ─── D5106 개인회생채권자목록 ────────────────────────────────────
// 법 제589조②, 제79조: 채권자목록 — 채권자별 원리금·담보·미확정 등 상세
export const d5106CreditorItemSchema = z.object({
  bond_number: z.number().int().positive(),               // 순번
  classify: z.enum(['자연인', '법인', '국가', '지방자치단체']),
  creditor_name: z.string().min(1, '채권자명 필수'),
  branch_name: z.string().optional(),                     // 지점명
  postal_code: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  fax: z.string().optional(),
  mobile: z.string().optional(),
  bond_cause: z.string().min(1, '채권 원인 필수'),         // 채권의 원인
  capital: z.number().int().nonnegative(),                 // 원금
  capital_compute: z.string().optional(),                  // 원금 산출근거
  interest: z.number().int().nonnegative().default(0),     // 이자
  interest_compute: z.string().optional(),                 // 이자 산출근거
  delay_rate: z.number().nonnegative().default(0),         // 지연이자율 %
  bond_content: z.string().optional(),                     // 원리금 내용
  // 별제권(담보) 정보
  is_secured: z.boolean().default(false),
  lien_type: z.string().optional(),                        // 담보권 유형
  lien_priority: z.number().int().nonnegative().optional(),
  max_claim_amount: z.number().int().nonnegative().optional(), // 채권최고액
  secured_collateral_value: z.number().int().nonnegative().optional(), // 담보평가액
  // 미확정
  is_unsettled: z.boolean().default(false),
  unsettled_reason: z.string().optional(),
  unsettled_amount: z.number().int().nonnegative().optional(),
  // 보증인
  guarantor_name: z.string().optional(),
  guarantor_amount: z.number().int().nonnegative().optional(),
  // 변제배분 (계산 결과)
  remaining_unsecured: z.number().int().nonnegative().optional(),
  repay_ratio: z.number().nonnegative().optional(),        // %
  repay_monthly: z.number().int().nonnegative().optional(),
  repay_total: z.number().int().nonnegative().optional(),
});

export const d5106Schema = z.object({
  court_name: z.string().optional(),
  case_year: z.number().int().optional(),
  case_number: z.string().optional(),
  applicant_name: z.string().optional(),
  resident_number_masked: z.string().optional(),           // 주민등록번호 마스킹
  base_date: z.string().optional(),                        // 채권자목록 기준일

  // 요약
  total_capital: z.number().int().nonnegative(),
  total_interest: z.number().int().nonnegative(),
  total_debt: z.number().int().nonnegative(),
  secured_debt: z.number().int().nonnegative(),
  unsecured_debt: z.number().int().nonnegative(),

  // 채권자 행
  creditors: z.array(d5106CreditorItemSchema),

  // 부속서류
  include_secured_appendix: z.boolean().default(false),    // 별제권부채권 부속서류
  include_summary_table: z.boolean().default(false),       // 요약표
  submission_date: z.string().optional(),
});

// ─── D5112 변제계획안 간이양식 ──────────────────────────────────
// 법 제610~614조: 간이양식은 가용소득·변제기간·채권자배분만 기재
export const d5112Schema = z.object({
  // 사건 정보
  court_name: z.string().optional(),
  case_year: z.number().int().optional(),
  case_number: z.string().optional(),
  applicant_name: z.string().optional(),

  // 1절: 변제기간
  repayment_start_date: z.string(),                        // YYYY-MM-DD
  repayment_end_date: z.string().optional(),               // YYYY-MM-DD (자동 계산)
  repay_months: z.number().int().min(36).max(60),

  // 2절: 변제에 제공되는 소득/재산
  annual_income: z.number().int().nonnegative(),           // 연수입
  monthly_income: z.number().int().nonnegative(),          // 월수입(실수령)
  living_cost: z.number().int().nonnegative(),             // 월 생계비
  monthly_available: z.number().int().nonnegative(),       // 월 가용소득
  has_property_disposal: z.boolean().default(false),       // 재산처분 유무
  disposal_property_name: z.string().optional(),           // 처분재산명
  disposal_expected_amount: z.number().int().nonnegative().optional(), // 처분예상액

  // 3절: 개인회생재단채권 변제
  has_estate_claim: z.boolean().default(false),            // 재단채권 해당/미해당
  estate_claim_amount: z.number().int().nonnegative().optional(),

  // 4절: 일반 우선권 있는 채권
  has_priority_claim: z.boolean().default(false),
  priority_claim_amount: z.number().int().nonnegative().optional(),

  // 5절: 별제권부 채권 처리
  secured_creditor_schedule: z.array(z.object({
    creditor_name: z.string(),
    secured_claim: z.number().int().nonnegative(),         // 별제권부 채권액
    repay_amount: z.number().int().nonnegative(),          // 변제예정액
  })).optional(),

  // 6절: 계산 결과 — 기초사항
  total_debt: z.number().int().nonnegative(),
  total_unsecured_debt: z.number().int().nonnegative(),
  monthly_repay: z.number().int().nonnegative(),
  total_repay_amount: z.number().int().nonnegative(),
  repay_rate: z.number().nonnegative(),                    // %
  liquidation_value: z.number().int().nonnegative(),
  liquidation_guaranteed: z.boolean(),

  // 채권자별 변제배분
  creditor_schedule: z.array(z.object({
    bond_number: z.number().int(),
    creditor_name: z.string(),
    total_claim: z.number().int().nonnegative(),
    repay_ratio: z.number().nonnegative(),
    monthly_amount: z.number().int().nonnegative(),
    total_amount: z.number().int().nonnegative(),
  })),

  // 변제방법
  repayment_method: z.enum(['매월', '격월', '분기']).default('매월'),
  trustee_name: z.string().optional(),
  trustee_account: z.string().optional(),
  submission_date: z.string().optional(),
});

// ─── D5114 금지명령 신청서 ──────────────────────────────────────
// 법 제593조①: 개인회생 개시신청 후 강제집행 금지 명령 신청
export const d5114Schema = z.object({
  // 사건 정보
  court_name: z.string().min(1, '법원명 필수'),
  case_year: z.number().int().optional(),
  case_number: z.string().optional(),

  // 신청인(채무자)
  applicant_name: z.string().min(1, '신청인 이름 필수'),
  resident_number_front: z.string().optional(),            // 주민등록번호 앞 6자리
  registered_address: z.string().optional(),               // 등록 기준지
  current_address: z.string().optional(),                  // 현재 주소

  // 대리인
  has_agent: z.boolean().default(false),
  agent_type: z.enum(['법무사', '변호사', '기타']).optional(),
  agent_name: z.string().optional(),
  agent_phone: z.string().optional(),
  agent_fax: z.string().optional(),
  agent_address: z.string().optional(),
  agent_law_firm: z.string().optional(),                   // 법무법인명

  // 신청 내용
  total_debt_amount: z.number().int().nonnegative(),       // 총 채무액
  creditor_count: z.number().int().nonnegative(),          // 채권자 수
  reason_detail: z.string().optional(),                    // 금지명령 필요 사유 상세

  // 소명방법 (첨부서류)
  attachments: z.array(z.enum([
    '개인회생신청서사본',
    '채권자목록',
    '재산목록',
    '수입지출목록',
  ])).default(['개인회생신청서사본', '채권자목록', '재산목록', '수입지출목록']),

  application_date: z.string().optional(),                 // YYYY-MM-DD
});

// ─── D5113 중지명령 신청서 ──────────────────────────────────────
// 법 §593: 이미 진행 중인 강제집행 등의 절차를 중지하는 명령 신청
export const d5113Schema = z.object({
  court_name: z.string().min(1, '법원명 필수'),
  case_year: z.number().int().optional(),
  case_number: z.string().optional(),

  applicant_name: z.string().min(1, '신청인 이름 필수'),
  resident_number_front: z.string().optional(),
  registered_address: z.string().optional(),
  current_address: z.string().optional(),

  // 중지 대상 사건
  target_case_number: z.string().min(1, '중지 대상 사건번호 필수'),
  target_creditor: z.string().optional(),                   // 집행채권자
  target_court: z.string().optional(),                      // 집행법원

  // 집행 종류
  execution_types: z.array(z.enum([
    '채권압류및추심명령',
    '채권압류및전부명령',
    '부동산경매',
    '자동차경매',
    '유체동산압류',
  ])).min(1, '집행 종류를 1개 이상 선택하세요'),

  reason_detail: z.string().optional(),
  application_date: z.string().optional(),
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

export function validateD5106(data: unknown) {
  const r = d5106Schema.safeParse(data);
  return r.success ? { ok: true as const, data: r.data } : { ok: false as const, error: r.error.issues.map(i => i.message).join(', ') };
}

export function validateD5112(data: unknown) {
  const r = d5112Schema.safeParse(data);
  return r.success ? { ok: true as const, data: r.data } : { ok: false as const, error: r.error.issues.map(i => i.message).join(', ') };
}

export function validateD5113(data: unknown) {
  const r = d5113Schema.safeParse(data);
  return r.success ? { ok: true as const, data: r.data } : { ok: false as const, error: r.error.issues.map(i => i.message).join(', ') };
}

export function validateD5114(data: unknown) {
  const r = d5114Schema.safeParse(data);
  return r.success ? { ok: true as const, data: r.data } : { ok: false as const, error: r.error.issues.map(i => i.message).join(', ') };
}
