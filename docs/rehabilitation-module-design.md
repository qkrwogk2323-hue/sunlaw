# 개인회생 모듈 설계서

> Vein Spiral 플랫폼 내 개인회생 자동작성 시스템 통합 설계

---

## 1. 기존 자산 분석

### 1.1 HTML v4 모듈 구성 (3,673줄)

| 탭 | 데이터 모델 키 | 핵심 계산 로직 |
|---|---|---|
| 신청인 | `D.app` | 주민번호 검증, 다음 우편번호 API, 금지/중지명령 문서 생성 |
| 채권자 | `D.creditors[]`, `D.credSettings`, `D.securedProperties[]` | 별제권 배분 계산, 채권현재액 합산, 15억/10억 자격 검증, CSV 전자소송 변환 |
| 재산 | `D.properties{}` | 14개 카테고리별 청산가치 산정 (보험 보장성 공제, 퇴직금 1/2, 예금/보험 250만 공제) |
| 수입지출/변제기간 | `D.income`, `D.family[]` | 기준중위소득 60% 자동산정, 변제액/변제율/변제기간 계산, 청산가치보장 검증 |
| 진술서 | `D.affidavit` | 텍스트 입력만 (계산 없음) |
| 변제계획안 10항 | `D.planSections` | 자동채움 + 텍스트 입력 |
| 자료제출목록 | (출력 전용) | 관할법원별 제출서류 양식 생성 |

### 1.2 재사용 가능한 계산 로직

```
src/lib/rehabilitation/
├── median-income.ts        ← MEDIAN_INCOME 테이블 (2024~2026)
├── repayment-calculator.ts ← calculateRepayment() 핵심 로직
├── secured-allocation.ts   ← calculateSecuredAllocations() 별제권 배분
├── property-valuation.ts   ← updatePropertySums() 청산가치 산정
├── schedule-generator.ts   ← generateRepaySchedule() 채권자별 변제 스케줄
├── financial-institutions.ts ← 은행/카드사 검색 DB (30+개 기관)
└── validators.ts           ← 주민번호, 전화번호, 15억/10억 자격 검증
```

### 1.3 기존 Vein Spiral 연동점

| 기존 요소 | 연동 방법 |
|---|---|
| `cases.case_type = 'insolvency'` | `insolvency_subtype = 'individual_rehabilitation'`인 사건에만 모듈 활성화 |
| `cases.module_flags.insolvency = true` | 모듈 진입 조건 |
| `insolvency_creditors` 테이블 (0066 migration) | 채권자 데이터의 정규화 저장소로 확장 |
| `case_clients` | 신청인 정보 프리필 (client_name, client_email_snapshot) |
| `organizations` | 대리인 정보 프리필 (address, phone, representative) |
| `cases.court_name`, `cases.case_number` | 관할법원/사건번호 프리필 |

---

## 2. DB 스키마 설계

### 2.1 신규 테이블

```sql
-- ═══════════════════════════════════════════════════
-- 개인회생 신청서 (1 사건 : 1 신청서)
-- ═══════════════════════════════════════════════════
create table public.rehabilitation_applications (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  case_id         uuid not null references cases(id) on delete cascade,

  -- 신청인 인적사항 (PII — 별도 RLS)
  applicant_name         text,
  resident_number_front  text,        -- 앞 6자리만 저장
  resident_number_hash   text,        -- 뒷 7자리 해시
  registered_address     jsonb,       -- {zip, address}
  current_address        jsonb,
  office_address         jsonb,
  service_address        jsonb,       -- 송달주소
  service_recipient      text,        -- 송달영수인
  phone_home             text,
  phone_mobile           text,
  return_account         text,        -- 적립금 반환계좌

  -- 소득 정보
  income_type            text check (income_type in ('salary', 'business')),
  employer_name          text,
  position               text,
  work_period            text,
  has_extra_income       boolean default false,
  extra_income_name      text,
  extra_income_source    text,

  -- 신청 관련
  application_date       date,
  court_name             text,
  court_detail           text,
  judge_division         text,
  case_year              int,
  case_number            text,
  repayment_start_date   date,
  repayment_start_uncertain boolean default false,
  repayment_start_day    int,

  -- 개인회생위원 계좌
  trustee_bank_name      text,
  trustee_bank_account   text,

  -- 기존 신청 여부
  prior_applications     jsonb,       -- [{type, name, case_number}]

  -- 대리인
  agent_type             text check (agent_type in ('법무사','변호사','기타')),
  agent_name             text,
  agent_phone            text,
  agent_email            text,
  agent_fax              text,
  agent_address          jsonb,

  -- 문서 옵션
  info_request_form      boolean default false,
  ecourt_agreement       boolean default false,
  delegation_form        boolean default false,

  lifecycle_status       text not null default 'active',
  created_by             uuid references profiles(id) on delete set null,
  updated_by             uuid references profiles(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint uq_rehab_app_case unique (case_id)
);

-- ═══════════════════════════════════════════════════
-- 채권자 설정 (1 사건 : 1 설정)
-- ═══════════════════════════════════════════════════
create table public.rehabilitation_creditor_settings (
  id              uuid primary key default gen_random_uuid(),
  case_id         uuid not null references cases(id) on delete cascade,

  list_date       date,              -- 목록작성일
  bond_date       date,              -- 채권액산정기준일
  repay_type      text not null default 'sequential'
                  check (repay_type in ('sequential','combined')),
  summary_table   boolean default false,
  copy_with_evidence boolean default false,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint uq_rehab_cred_settings_case unique (case_id)
);

-- ═══════════════════════════════════════════════════
-- 채권자 목록 (1 사건 : N 채권자)
-- ═══════════════════════════════════════════════════
create table public.rehabilitation_creditors (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references cases(id) on delete cascade,
  organization_id  uuid not null references organizations(id) on delete cascade,

  bond_number      int not null,       -- 채권자 번호
  classify         text default '자연인' check (classify in ('자연인','법인')),
  creditor_name    text not null,
  branch_name      text,
  postal_code      text,
  address          text,
  phone            text,
  fax              text,
  mobile           text,

  -- 채권 정보
  bond_cause       text,               -- 채권의 원인
  capital          bigint default 0,    -- 원금
  capital_compute  text,                -- 원금 산정근거
  interest         bigint default 0,    -- 이자
  interest_compute text,                -- 이자 산정근거
  delay_rate       numeric(6,4) default 0, -- 연체이율
  bond_content     text,                -- 채권의 내용

  -- 분류 플래그
  is_secured       boolean default false,  -- 담보부
  secured_property_id uuid,            -- → rehabilitation_secured_properties
  lien_priority    int default 0,
  lien_type        text,
  max_claim_amount bigint default 0,    -- 채권최고액
  has_priority_repay boolean default false, -- 우선변제권
  is_unsettled     boolean default false,   -- 미확정채권
  is_annuity_debt  boolean default false,   -- 별제권부기금부연금채무
  apply_restructuring boolean default false, -- 채무재조정적용

  -- 부속서류
  attachments      int[] default '{}',  -- [1,2,3,4]

  -- 미확정채권 상세
  unsettled_reason  text,
  unsettled_amount  bigint default 0,
  unsettled_text    text,

  -- 보증인 상세
  guarantor_name    text,
  guarantor_resident_hash text,
  guarantor_amount  bigint default 0,
  guarantor_text    text,

  -- 변제 스케줄 (계산 결과 캐시)
  repay_ratio       numeric(10,8) default 0,
  repay_monthly     bigint default 0,
  repay_total       bigint default 0,
  repay_capital     bigint default 0,
  repay_interest    bigint default 0,

  sort_order        int default 0,
  lifecycle_status  text not null default 'active',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_rehab_creditors_case on rehabilitation_creditors(case_id, bond_number);

-- ═══════════════════════════════════════════════════
-- 별제권 담보물건 (1 사건 : N 담보물건)
-- ═══════════════════════════════════════════════════
create table public.rehabilitation_secured_properties (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references cases(id) on delete cascade,

  property_type    text not null default '부동산',
  description      text,
  market_value     bigint default 0,    -- 환가예상액(시가)
  valuation_rate   numeric(5,2) default 70, -- 환가비율
  note             text,

  sort_order       int default 0,
  lifecycle_status text not null default 'active',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════
-- 재산 목록 (14개 카테고리 × N 항목)
-- ═══════════════════════════════════════════════════
create table public.rehabilitation_properties (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references cases(id) on delete cascade,

  category         text not null,       -- cash, deposit, insurance, car, ...
  detail           text,                -- 재산 세부 사항
  amount           bigint default 0,    -- 금액
  seizure          text default '무',   -- 압류 유무
  repay_use        text default '무',   -- 변제투입 유무
  is_protection    boolean default false, -- 보장성보험 여부

  sort_order       int default 0,
  lifecycle_status text not null default 'active',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- 카테고리별 공제금액
create table public.rehabilitation_property_deductions (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references cases(id) on delete cascade,
  category         text not null,
  deduction_amount bigint default 0,

  constraint uq_rehab_prop_deduction unique (case_id, category)
);

-- ═══════════════════════════════════════════════════
-- 가족관계 (1 사건 : N 가족)
-- ═══════════════════════════════════════════════════
create table public.rehabilitation_family_members (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references cases(id) on delete cascade,

  relation         text not null,        -- 관계
  member_name      text not null,
  age              text,
  cohabitation     text,                 -- 동거여부 및 기간
  occupation       text,
  monthly_income   bigint default 0,
  total_property   bigint default 0,
  is_dependent     boolean default false, -- 부양유무

  sort_order       int default 0,
  lifecycle_status text not null default 'active',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════
-- 수입지출 / 변제기간 설정 (1 사건 : 1 레코드)
-- ═══════════════════════════════════════════════════
create table public.rehabilitation_income_settings (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references cases(id) on delete cascade,

  -- 소득
  gross_salary     bigint default 0,
  net_salary       bigint default 0,
  extra_income     bigint default 0,

  -- 생계비
  median_income_year   int default 2026,
  living_cost          bigint default 0,
  living_cost_direct   boolean default false,
  living_cost_range    text default 'within' check (living_cost_range in ('within','exceed')),
  extra_living_cost    bigint default 0,
  extra_living_percent numeric(5,2) default 0,

  -- 기타
  trustee_comm_rate    numeric(5,2) default 0,
  child_support        bigint default 0,
  dispose_amount       bigint default 0,
  dispose_period       text,

  -- 변제기간 설정
  repay_period_option  text default 'capital60',
  repay_months         int default 60,
  repay_rate_display   text default '2',

  -- 계산 결과 캐시
  monthly_available    bigint default 0,
  monthly_repay        bigint default 0,
  total_repay_amount   bigint default 0,
  repay_rate           numeric(10,4) default 0,
  total_debt           bigint default 0,
  total_capital        bigint default 0,
  total_interest       bigint default 0,
  secured_debt         bigint default 0,
  unsecured_debt       bigint default 0,
  liquidation_value    bigint default 0,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint uq_rehab_income_case unique (case_id)
);

-- ═══════════════════════════════════════════════════
-- 진술서 (1 사건 : 1 진술서)
-- ═══════════════════════════════════════════════════
create table public.rehabilitation_affidavits (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references cases(id) on delete cascade,

  debt_history     text,       -- 채무의 경위 및 내용
  property_change  text,       -- 재산의 변동 상황
  income_change    text,       -- 수입 및 지출의 변동 상황
  living_situation text,       -- 생활 상황
  repay_feasibility text,      -- 변제계획의 이행가능성

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint uq_rehab_affidavit_case unique (case_id)
);

-- ═══════════════════════════════════════════════════
-- 변제계획안 10항 (1 사건 : 10 항목)
-- ═══════════════════════════════════════════════════
create table public.rehabilitation_plan_sections (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references cases(id) on delete cascade,

  section_number   int not null check (section_number between 1 and 10),
  content          text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint uq_rehab_plan_section unique (case_id, section_number)
);
```

### 2.2 RLS 정책

```sql
-- 모든 rehabilitation_* 테이블에 동일 패턴 적용
alter table public.rehabilitation_applications enable row level security;
-- (나머지 테이블도 동일)

-- 조직 소속원만 접근 가능
create policy "org_member_access" on rehabilitation_applications
  for all using (
    organization_id in (
      select organization_id from organization_memberships
      where profile_id = auth.uid()
    )
  );
```

---

## 3. 라우트 구조

```
src/app/(app)/organizations/[organizationId]/cases/[caseId]/rehabilitation/
├── page.tsx                 ← 메인 진입점 (탭 네비게이션)
├── layout.tsx               ← 권한 체크 + case_type 검증
├── applicant/
│   └── page.tsx             ← 탭1: 신청인
├── creditors/
│   └── page.tsx             ← 탭2: 채권자
├── property/
│   └── page.tsx             ← 탭3: 재산
├── income/
│   └── page.tsx             ← 탭4: 수입지출/변제기간
├── affidavit/
│   └── page.tsx             ← 탭5: 진술서
├── plan/
│   └── page.tsx             ← 탭6: 변제계획안 10항
└── documents/
    └── page.tsx             ← 탭7: 자료제출목록 + 출력
```

### 3.1 사건 상세에서 진입

```
organizations/[orgId]/cases/[caseId]
  → case_type === 'insolvency' && insolvency_subtype === 'individual_rehabilitation'
    → 사이드바에 "개인회생" 메뉴 그룹 표시
    → 사건 상세 페이지에 "개인회생 작성" 바로가기 카드 표시
```

---

## 4. 컴포넌트 설계

### 4.1 공통 레이아웃

```
RehabilitationLayout
├── RehabTabNav              ← 7개 탭 네비게이션 (현재 탭 하이라이트)
├── RehabSummaryBar          ← 하단 고정 요약 바 (채권합계, 변제액 등)
└── {children}               ← 각 탭 페이지
```

### 4.2 탭별 주요 컴포넌트

```
[탭1] ApplicantPage
├── ApplicantInfoCard         ← 인적사항 (사건 client 정보 프리필)
├── ApplicantIncomeCard       ← 소득 정보
├── ApplicationInfoCard       ← 신청 관련 (법원/사건번호 프리필)
├── TrusteeAccountCard        ← 개인회생위원 계좌
├── PriorApplicationCard      ← 기존 파산/회생 신청 여부
└── AgentInfoCard             ← 대리인 (조직 정보 프리필)

[탭2] CreditorsPage
├── CreditorSettingsCard      ← 설정사항
├── CreditorSummaryCard       ← 채권액 합계 (자동계산)
├── SecuredPropertiesCard     ← 별제권 담보물건 관리
├── SecuredAttachmentPreview  ← 별제권 부속서류 미리보기
├── CreditorList              ← 채권자 목록 (동적 추가/삭제)
│   └── CreditorItem          ← 개별 채권자 카드
└── CreditorFooter            ← 하단 고정 (추가/CSV/재정렬)

[탭3] PropertyPage
├── PropertyCategory (×14)    ← 카테고리별 재산 입력
│   ├── PropertyDeductionBar  ← 공제금액 (예금/보험)
│   └── PropertyItemTable     ← 항목 테이블
└── PropertySummary           ← 청산가치 합계

[탭4] IncomePage
├── FamilyTable               ← 가족관계
├── MedianIncomeCard          ← 기준중위소득 60% 테이블
├── ApplicantIncomeCard       ← 신청인 월수입
├── LivingCostCard            ← 생계비 산정
├── RepaymentPeriodCard       ← 변제기간 설정
└── RepaymentResultCard       ← 계산 결과

[탭5] AffidavitPage
└── AffidavitForm             ← 5개 항목 텍스트 입력

[탭6] PlanPage
└── PlanSectionsForm          ← 10개 항목 텍스트 입력 + 자동채움

[탭7] DocumentsPage
├── CourtDocumentList         ← 관할법원별 제출서류
├── PrintOptionsCard          ← 출력 옵션
└── ExportCard                ← JSON/CSV 내보내기
```

### 4.3 모달 컴포넌트

```
src/components/rehabilitation/
├── modals/
│   ├── CreditorSortModal.tsx         ← 채권자 번호 재정렬
│   ├── AttachmentSelectModal.tsx     ← 부속서류 1,2,3,4 선택
│   ├── UnsettledClaimModal.tsx       ← 미확정채권 입력
│   ├── GuarantorModal.tsx            ← 보증인 정보 입력
│   ├── ExtraLivingCostModal.tsx      ← 추가생계비 입력
│   ├── TrusteeChildModal.tsx         ← 회생위원 보수/양육비
│   ├── DisposablePropertyModal.tsx   ← 처분할 재산
│   ├── ProhibitionOrderModal.tsx     ← 금지명령 신청서
│   ├── SuspensionOrderModal.tsx      ← 중지명령 신청서
│   └── PrintModal.tsx                ← 출력 옵션
└── shared/
    ├── MoneyInput.tsx                ← 금액 입력 (자동 콤마)
    ├── AddressSearch.tsx             ← 다음 우편번호 API
    ├── FinancialSearch.tsx           ← 금융기관 검색
    └── RehabFormRow.tsx              ← 폼 행 레이아웃
```

---

## 5. Server Actions

```
src/lib/actions/rehabilitation-actions.ts

// 신청인
saveRehabApplicationAction(formData)
loadRehabApplicationAction(caseId)

// 채권자
saveCreditorSettingsAction(formData)
addCreditorsAction(caseId, count)
updateCreditorAction(creditorId, data)
deleteCreditorAction(creditorId)       ← soft delete
reorderCreditorsAction(caseId, order[])
importCreditorsFromCSVAction(caseId, csvData)

// 별제권
addSecuredPropertyAction(caseId, data)
updateSecuredPropertyAction(propertyId, data)
deleteSecuredPropertyAction(propertyId) ← soft delete

// 재산
savePropertyItemAction(caseId, category, items[])
updatePropertyDeductionAction(caseId, category, amount)

// 가족
saveFamilyMembersAction(caseId, members[])

// 수입지출
saveIncomeSettingsAction(caseId, data)
calculateRepaymentAction(caseId)       ← 서버에서 계산 후 결과 저장

// 진술서
saveAffidavitAction(caseId, data)

// 변제계획안
savePlanSectionsAction(caseId, sections[])
autoFillPlanSectionsAction(caseId)     ← 기존 데이터 기반 자동 생성

// 문서 출력
generateDocumentAction(caseId, type)   ← PDF/DOCX 생성
exportToJSONAction(caseId)
exportToCSVAction(caseId)              ← 전자소송 CSV
```

---

## 6. TypeScript 계산 모듈

### 6.1 기준중위소득

```typescript
// src/lib/rehabilitation/median-income.ts
export const MEDIAN_INCOME_60: Record<number, number[]> = {
  2026: [1_538_543, 2_519_575, 3_215_422, 3_896_843, 4_534_031, 5_133_571],
  2025: [1_484_524, 2_430_560, 3_104_153, 3_762_012, 4_377_024, 4_955_258],
  2024: [1_337_067, 2_192_584, 2_798_953, 3_392_436, 3_947_805, 4_475_320],
};

export function getLivingCost(year: number, dependentCount: number): number {
  const data = MEDIAN_INCOME_60[year] ?? MEDIAN_INCOME_60[2026];
  const householdSize = 1 + dependentCount; // 본인 + 부양가족
  const idx = Math.min(householdSize, 6) - 1;
  return data[idx];
}
```

### 6.2 변제액 계산기

```typescript
// src/lib/rehabilitation/repayment-calculator.ts
export interface RepaymentInput {
  creditors: { capital: number; interest: number; isSecured: boolean }[];
  securedResults: SecuredAllocationResult[];
  monthlyIncome: number;        // 본인 + 가족 소득 합계
  livingCost: number;
  extraLivingCost: number;
  childSupport: number;
  trusteeCommRate: number;      // %
  disposeAmount: number;
  repayOption: RepayPeriodOption;
  liquidationValue: number;
}

export interface RepaymentResult {
  monthlyAvailable: number;
  monthlyRepay: number;
  repayMonths: number;
  totalRepayAmount: number;
  repayRate: number;            // %
  totalDebt: number;
  totalCapital: number;
  totalInterest: number;
  securedDebt: number;
  unsecuredDebt: number;
  liquidationWarning: boolean;
}

export function calculateRepayment(input: RepaymentInput): RepaymentResult
```

### 6.3 별제권 배분

```typescript
// src/lib/rehabilitation/secured-allocation.ts
export interface SecuredAllocationResult {
  creditorId: string;
  capitalCurrent: number;       // ①
  interestCurrent: number;      // ②
  securedRepayEstimate: number; // ③
  unrecoverableAmount: number;  // ④
  securedRehabAmount: number;   // ⑤
  unsecuredConversion: number;
}

export function calculateSecuredAllocations(
  properties: SecuredProperty[],
  creditors: CreditorWithLien[]
): SecuredAllocationResult[]
```

### 6.4 청산가치 산정

```typescript
// src/lib/rehabilitation/property-valuation.ts
export function calculateLiquidationValue(
  properties: Record<string, PropertyCategory>,
  deductions: Record<string, number>
): { total: number; byCategory: Record<string, number> }
```

---

## 7. mode-aware-nav.tsx 등록

```typescript
// 사건 하위 메뉴 — insolvency_subtype === 'individual_rehabilitation' 조건부
{
  label: '개인회생',
  icon: FileText,
  children: [
    { label: '신청인', href: `.../rehabilitation/applicant` },
    { label: '채권자', href: `.../rehabilitation/creditors` },
    { label: '재산', href: `.../rehabilitation/property` },
    { label: '수입지출', href: `.../rehabilitation/income` },
    { label: '진술서', href: `.../rehabilitation/affidavit` },
    { label: '변제계획안', href: `.../rehabilitation/plan` },
    { label: '서류/출력', href: `.../rehabilitation/documents` },
  ],
  condition: (caseData) => caseData.case_type === 'insolvency'
    && caseData.insolvency_subtype === 'individual_rehabilitation',
}
```

---

## 8. 구현 순서

| 단계 | 범위 | 예상 규모 |
|---|---|---|
| **Phase 1** | DB 마이그레이션 + TypeScript 계산 모듈 추출 | migration 1개 + ts 6개 |
| **Phase 2** | 신청인 탭 (프리필 연동 포함) | page 1 + components 6 + action 2 |
| **Phase 3** | 채권자 탭 (별제권 포함) | page 1 + components 8 + modals 4 + actions 7 |
| **Phase 4** | 재산 탭 | page 1 + components 3 + actions 2 |
| **Phase 5** | 수입지출 탭 (계산 연동) | page 1 + components 5 + actions 3 |
| **Phase 6** | 진술서 + 변제계획안 탭 | pages 2 + components 2 + actions 3 |
| **Phase 7** | 서류/출력 탭 + PDF 생성 | page 1 + components 3 + actions 3 |
| **Phase 8** | 사이드바 등록 + 전체 테스트 | nav 수정 + E2E |

---

## 9. P0 병행 수정 목록

Phase 진행 중 관련 파일 수정 시 함께 적용:

| P0 항목 | 관련 Phase | 수정 내용 |
|---|---|---|
| 목록 쿼리 limit 없음 | Phase 3 (채권자) | `queries/cases.ts`, `queries/clients.ts`에 limit 추가 |
| soft delete 필터 누락 | Phase 1 (migration) | `queries/calendar.ts`, `queries/inbox.ts`에 필터 추가 |
| 존재하지 않는 테이블 참조 | Phase 1 | dead code 제거 또는 guard 추가 |

---

## 10. 보안 고려사항

- 주민등록번호 뒷자리는 해시만 저장 (`resident_number_hash`)
- 계좌번호는 마스킹 표시 (마지막 4자리만 노출)
- `rehabilitation_applications` 테이블은 RLS + 조직 소속 확인 필수
- 출력/내보내기 시 감사 로그 기록
- 클라이언트 포털에서는 개인회생 데이터 접근 불가
