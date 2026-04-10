# Korean Court Rehabilitation Filing Rules vs. Vein Spiral Schema — Gap Analysis

**Date:** 2026-04-10
**Source Documents:** Court Processing Rules (처리지침), D5100 Series Forms, Vein Spiral migrations 007, 008, 012
**Analysis Scope:** Individual Rehabilitation (개인회생) forms, business rules, reference data tables

---

## PART 1: D-Series Court Forms Implementation Status

| Form ID | Form Name (법원 양식) | DB Implementation | Status | Missing Fields / Notes |
|---------|-----|------|--------|------------|
| **D5100** | 개시신청서 (Application for Rehabilitation) | `rehabilitation_applications` | ✅ COMPLETE | All applicant info, court details, agent info, prior applications implemented. |
| **D5101** | 재산목록 (Property List) | `rehabilitation_properties` + `rehabilitation_secured_properties` | ⚠️ PARTIAL | ❌ **Missing:** lien holder's creditor classification (자연인/법인 구분). Cannot cross-reference lien_holder text to insolvency_creditors.classify. |
| **D5103** | 수입지출목록 (Income/Expense Statement) | `rehabilitation_income_settings` | ⚠️ PARTIAL | ❌ **Missing:** breakdown by income type (급여/사업소득/기타) as separate line items. Currently only `gross_salary`, `net_salary`, `extra_income` aggregates. No detailed breakdown table. |
| **D5105** | 진술서 (Affidavit / Sworn Statement) | `rehabilitation_affidavits` | ✅ COMPLETE | All 5 narrative fields: debt_history, property_change, income_change, living_situation, repay_feasibility. |
| **D5106** | 채권자목록 (Creditor List) | `rehabilitation_creditors` | ✅ COMPLETE | All fields: classify, creditor details, bond cause, capital/interest, secured/unsecured classification, objection flag, guarantor info. |
| **D5108** | 재단미속재산목록 (Non-Estate Property Declaration) | ❌ NOT IMPLEMENTED | ❌ MISSING | **Entire table missing.** Needed to declare assets NOT belonging to rehabilitation estate (신탁재산, 상속대기자산 등). See rehabilitation_creditors.is_other_unconfirmed as proxy only. |
| **D5109** | 면제재산결정신청서 (Exempt Property Application) | ❌ NOT IMPLEMENTED | ❌ MISSING | **Entire table missing.** Court form for requesting exemption of specific property from estate (현재 거주주택, 생활필수용품 등). |
| **D5110** | 변제계획안 (가용소득만) (Repayment Plan — Available Income Only) | `rehabilitation_income_settings` | ✅ COMPLETE | Monthly available income, trustee commission, monthly repay amount, total repay, repay rate, repayment method, liquidation guarantee flag, trustee account/name all present. |
| **D5111** | 변제계획안 (가용소득+재산처분) (Repayment Plan — Income + Asset Disposal) | `rehabilitation_income_settings` + `rehabilitation_creditors` cache | ✅ COMPLETE | disposal_amount, disposal_period fields in income_settings. Creditor-level repay_ratio, repay_monthly, repay_total, repay_capital, repay_interest cached. Detail schedule (monthly breakdown by creditor) generated in app layer. |
| **D5112** | 변제계획안 간이양식 (Simplified Repayment Plan) | ❌ NOT IMPLEMENTED | ❌ MISSING | **Entire table missing.** Simplified form variant for minor cases. Could use same schema as D5110/D5111 with flag, but UI/validation rules differ. |
| **D5115** | 소득증명서 (Income Certificate) | ❌ NOT IMPLEMENTED | ❌ MISSING | **Entire table missing.** Document ingestion from external source (employer, tax office). Currently only app-entered income_settings. |
| **D5116** | 소득진술서 (Income Affidavit) | ❌ NOT IMPLEMENTED | ❌ MISSING | **Entire table missing.** Debtor's sworn statement of income. Could be stored in rehabilitation_affidavits but separate form status tracking needed. |
| **D5117** | 확인서 (Verification Certificate) | ❌ NOT IMPLEMENTED | ❌ MISSING | **Entire table missing.** Court verification of debtor's financial status. Output-only document. |
| **D5118** | 자료송부청구서 (Request for Information from Creditor) | ❌ NOT IMPLEMENTED | ❌ MISSING | **Entire table missing.** Form to request creditor's account statements. Document workflow table needed. |
| **D5119** | 자료송부서 (Submission of Information by Creditor) | ❌ NOT IMPLEMENTED | ❌ MISSING | **Entire table missing.** Creditor's response. Ingestion job tracking via document_ingestion_jobs but no dedicated schema. |
| **D5120** | 채권자목록 수정허가신청서 (Request to Modify Creditor List) | ❌ NOT IMPLEMENTED | ❌ MISSING | **Entire table missing.** Post-filing modification form. Needs version control / amendment tracking on rehabilitation_creditors. |
| **D5121** | 변제계획 수정안제출서 (Modified Repayment Plan Submission) | ❌ NOT IMPLEMENTED | ❌ MISSING | **Entire table missing.** Amended plan post-filing. rehabilitation_income_settings is single version only, not versioned. |
| **D5122** | 변제계획 변경안 (Repayment Plan Amendment Notice) | ❌ NOT IMPLEMENTED | ❌ MISSING | **Entire table missing.** Alternative amendment form variant. |
| **D5123** | 채권자 계좌번호 신고서 (Creditor Account Number Disclosure) | ❌ NOT IMPLEMENTED | ❌ MISSING | **Entire table missing.** Form for creditors to register repayment bank accounts. rehabilitation_creditors has no account_number field (PII risk). Separate table with RLS + encryption needed. |
| **D5124/D5125** | 채권조사확정재판 신청서 / 채권조사결과 (Bond Investigation Determination) | ❌ NOT IMPLEMENTED | ❌ MISSING | **Entire table missing.** Court proceeding to finalize disputed claims. Would link insolvency_creditors.is_confirmed → court decision. |
| **D5128** | 재산조회신청서 (Property Inquiry Request) | ❌ NOT IMPLEMENTED | ❌ MISSING | **Entire table missing.** Form to request court property search (등기부등본, 금융자산 조회 등). Document workflow needed. |
| **D5129/D5130/D5131** | 채권자 명의변경 신청서 (Creditor Name Change Request) | ❌ NOT IMPLEMENTED | ❌ MISSING | **Entire table missing.** Form when creditor is merged/acquired. Would need amendment audit trail on rehabilitation_creditors. |

**Summary: D-Series Forms**
- ✅ Implemented: D5100, D5105, D5106, D5110, D5111 (5 forms)
- ⚠️ Partial: D5101, D5103 (2 forms)
- ❌ Missing: D5108, D5109, D5112, D5115–D5131 (15 forms)
- **Total Coverage: 5/22 = 23%**

---

## PART 2: Business Rules Implementation Status

### Living Expense Rule (생계비 규칙) — 처리지침 제7조

| Rule | Description | Implementation Status | Missing Details |
|------|-----|---------|----------|
| **제7조①** | Living cost = Median income (기준중위소득) × 60% | ✅ IMPLEMENTED | Formula correct. Table `insolvency_ruleset_constants` has 'minimum_livelihood_1_person' (815,000₩ for 2024). Multi-person thresholds partially defined (2 person at 1,354,000₩) but household size scaling incomplete for 3+ persons. |
| **제7조②** | Special circumstances exception: ±variance allowed | ⚠️ PARTIAL | `rehabilitation_income_settings.living_cost_direct` flag allows manual override. `living_cost_rate` (%) lets scaling. BUT: no audit trail field (`living_cost_override_reason text`) to document exception basis. No `special_circumstance_approved_by` (judge/trustee approval flag). |
| **제7조③** | Pre-approval escrow: monthly deposit from 60–90 days after filing start | ❌ NOT TRACKED | `rehabilitation_applications.application_date` + 90 days = escrow start date, but no: (1) `escrow_start_date` field, (2) `escrow_monthly_amount`, (3) `escrow_status` (pending/active/completed), (4) `escrow_account_bank_name`, (5) `escrow_account_number` (masked). No separate escrow ledger table. |

### Repayment Period Rule (변제기간 규칙) — 처리지침 제8조

| Rule | Description | Implementation Status | Missing Details |
|------|-----|---------|----------|
| **제8조①** | Standard: 3-year (36-month) repayment | ✅ IMPLEMENTED | `rehabilitation_income_settings.repay_period_option = 'capital36'` supported. Default period confirmed via seed data (0092 backfill: 61/84 cases = 36 months). |
| **제8조①** | Exception: up to 5-year (60-month) allowed for special hardship | ✅ IMPLEMENTED | `capital60` option supported. 21/84 COLAW cases use 60 months. But: no `special_hardship_reason text` field documenting exception basis. No `court_approval_for_extended_period` timestamp. |
| **제8조②** | Repayment priority: capital first, then interest | ✅ IMPLEMENTED | `rehabilitation_creditors.repay_capital`, `repay_interest` tracked separately. App layer enforces capital-priority allocation. |
| **제8조②** | All available income toward repayment | ✅ IMPLEMENTED | `rehabilitation_income_settings.monthly_available` = monthly_income - living_cost - trustee_commission. Matches rule. |

### Trustee Commission Rule (회생위원 보수) — 처리지침 제10조

| Rule | Description | Implementation Status | Missing Details |
|------|-----|---------|----------|
| **제10조** | Pre-approval: 150,000₩ fixed (or max 300,000₩ if extraordinary) | ⚠️ PARTIAL | `rehabilitation_income_settings.trustee_comm_rate` (%) exists. No fixed amount table referencing 별표1 (trustee fee table). No `trustee_name text` binding to actual trustee identity. No `has_external_trustee boolean` flag (COPILOT_TASK line 45 notes this is missing). |
| **제10조** | Post-approval: 0.5%–1% of held amount | ⚠️ PARTIAL | No post-approval commission calculation. No separate `post_approval_trustee_rate` field. Would require linking repayment_plans status=approved to trigger different rate. |
| **제10조 별표1** | Reference table: fee schedule by phase + amount | ⚠️ PARTIAL | `insolvency_ruleset_constants` table exists but entries limited. Missing canonical reference data for all fee brackets. |

### Managed Bank Rule (관리은행) — 처리지침 제11조

| Rule | Description | Implementation Status | Missing Details |
|------|-----|---------|----------|
| **제11조** | Account: designated court bank (별표2: 법원별 신한은행 지점) | ⚠️ PARTIAL | `rehabilitation_applications.trustee_bank_name` + `trustee_bank_account` stored. BUT: (1) no validation against 별표2 approved bank list, (2) no `court_code` field linking to bank branch, (3) no reference table for court → bank mapping. |
| **제11조** | Reserve requirement: 2× repayment buffer | ❌ NOT TRACKED | No `reserve_balance` or `reserve_buffer_multiplier` field. No monthly reserve adequacy checking. |

### Court Notification Rule — 처리지침 제18조

| Rule | Description | Implementation Status | Missing Details |
|------|-----|---------|----------|
| **제18조** | Notify Korean Credit Information Bureau (한국신용정보원): decision, discharge approval, closure | ❌ NOT TRACKED | No `credit_bureau_notification_sent_date` field. No notification workflow table. No linked insolvency_repayment_plans status='approved' trigger. Should sync to separate notification queue or audit log. |

---

## PART 3: Reference Data Tables (별표 / Reference Schedules)

| Reference | Court Form | Content | DB Implementation | Status | Missing Specifics |
|-----------|---------|---------|---|--------|---------|
| **별표1** | 회생위원 보수기준표 (Trustee Fee Schedule) | Fees for pre-approval (15만/30만) & post-approval (임치액 0.5%/1%) by case phase | `insolvency_ruleset_constants` partial seed (lines 115–135 of seed_data.sql) | ⚠️ PARTIAL | Only 6 constants seeded. Need full matrix: pre-approval flat rates (150k, 300k variants) + post-approval percentage tiers + annual CPI adjustments. |
| **별표2** | 법원관리은행 (Court Managed Banks) | Court code → Shinhan Bank branch mapping (법원별 신한은행 지점 + 법원코드) | ❌ NOT IMPLEMENTED | ❌ MISSING | Need reference table: (court_name, court_code, bank_name, bank_branch_code, bank_account_format). ~60 court entries required. |
| **자료제출목록** | Submission Checklist (관할법원별) | 10 categories: personal ID, property docs, income docs, debt docs, tax, residence, employment, marriage, business, other | ❌ NOT IMPLEMENTED | ❌ MISSING | Need enum/table: category + document_type + required_count + filing_deadline. No court-specific variant tracking. |

**Checklist Categories Needed:**
1. 인적사항 (Personal ID: resident ID, family register, marriage cert, divorce decree)
2. 재산관련 (Property: registration abstract, insurance policy, bank statement, pension documents)
3. 소득관련 (Income: tax return, income certificate, employment letter, business statement)
4. 부채관련 (Debt: debt certificate, creditor correspondence, credit report)
5. 세무 (Tax: tax assessment, tax clearance)
6. 주민등록 (Residence: address registration)
7. 고용 (Employment: employment certificate, salary statement)
8. 혼인 (Family status: marriage certificate, dependent proof)
9. 사업 (Business: business registration, lease agreement if applicable)
10. 기타 (Other: court orders, prior proceedings, special circumstances docs)

---

## PART 4: Rehabilitation Module Component Coverage

| Component | Purpose | Implementation | Status | Missing |
|-----------|---------|-----------------|--------|---------|
| **신청인 정보 탭** | Applicant personal data (applicant_name, resident#, address, contact, income type, employer, prior applications) | `rehabilitation_applications` | ✅ COMPLETE | None. |
| **채권자 관리 탭** | Creditor list with classification, bond details, guarantors, secured property links, objection tracking | `rehabilitation_creditors` | ✅ COMPLETE | Creditor account number table (D5123 support). |
| **재산 탭** | Property categories (부동산/동산/예금/보험/차량/임차보증금/퇴직금/기타), deductions, seizure status, lien info | `rehabilitation_properties` + deductions | ✅ COMPLETE | Lien holder classification link (D5101 enhancement). |
| **가족 탭** | Dependent info (name, age, relation, income, property, dependent status) | `rehabilitation_family_members` | ✅ COMPLETE | None. |
| **수입지출 탭** | Monthly income (salary + extra), living cost (median-based or custom), trustee commission, child support, disposal amount, repayment period selection, calculation cache | `rehabilitation_income_settings` | ⚠️ PARTIAL | (1) D5103 detailed breakdown by income source missing, (2) escrow schedule missing, (3) post-approval commission calculation missing. |
| **진술서 탭** | Free-text narratives: debt history, property changes, income changes, living situation, repayment feasibility | `rehabilitation_affidavits` | ✅ COMPLETE | None. |
| **변제계획안 탭** | Plan summary (period, monthly repay, total, rate, schedule by creditor), liquidation value guarantee check, repayment method (monthly/bimonthly/quarterly) | `rehabilitation_income_settings` + `rehabilitation_creditors` cache | ✅ COMPLETE | Plan versioning / amendment tracking (D5121 support). |
| **자료제출목록 탭** | Checklist of court-required documents by jurisdiction | ❌ NOT IMPLEMENTED | ❌ MISSING | Full checklist table + UI to track submission status. |
| **별제권 배분 탭** | Secured property allocation, liquidation value calculation, shortage determination | `rehabilitation_secured_properties` + creditor links | ✅ COMPLETE | None. |

---

## PART 5: Document Generation Status

| Document Template | Generated From | Status | Known Issues |
|---|---|---|---|
| D5100 신청서 | `rehabilitation_applications` | ✅ Generated | COPILOT_TASK notes: agent info binding, case_number formatting needs fixes. |
| D5101 재산목록 | `rehabilitation_properties` + `rehabilitation_secured_properties` | ✅ Generated | Lien holder classification missing. |
| D5103 수입지출목록 | `rehabilitation_income_settings` | ⚠️ Partial | Aggregate-only output. Detailed line items by income source (급여/사업/기타 breakdown) not provided. |
| D5105 진술서 | `rehabilitation_affidavits` | ✅ Generated | All fields bound correctly. |
| D5106 채권자목록 | `rehabilitation_creditors` | ✅ Generated | Address/phone/contact details need validation for completeness. |
| D5110 변제계획안 | `rehabilitation_income_settings` | ✅ Generated | Monthly repay, total, rate, repayment method all included. |
| D5111 변제계획안 (별지) | `rehabilitation_creditors` repay cache + app-layer schedule | ✅ Generated | Per-creditor monthly schedule generated in memory; no persistent schedule table. |
| D5112 간이양식 | — | ❌ Not generated | No simplified variant template. |

---

## PART 6: AI-Extracted Data Integration

| Form/Document Type | Ingestion Job | Staging Table | Final Schema | Status |
|---|---|---|---|---|
| 부채증명서 (Debt Certificate) | `document_ingestion_jobs` (document_type='debt_certificate') | `insolvency_creditors` (AI-extracted flag set) | `rehabilitation_creditors` (manual confirmation loop) | ✅ PIPELINE READY |
| 등기부등본 (Registration Abstract) | `document_ingestion_jobs` (document_type='registration_abstract') | — | `rehabilitation_properties` + `rehabilitation_secured_properties` | ⚠️ PARTIAL: No dedicated staging table; AI extraction result directly merged. |
| 보정권고서 (Correction Recommendation) | `document_ingestion_jobs` (document_type='correction_recommendation') | `insolvency_client_action_packets` + `insolvency_client_action_items` | — (checklist-only output) | ✅ IMPLEMENTED |
| 소득증명서 (Income Certificate) | ❌ Not defined | — | `rehabilitation_income_settings` | ❌ MISSING: No ingestion job type defined. Would need document_type='income_certificate' variant. |

---

## PART 7: Compliance & Audit Trail

| Requirement | Field/Table | Implementation | Status | Notes |
|---|---|---|---|---|
| **Application Date Tracking** | `rehabilitation_applications.application_date` | ✅ Stored | ✅ COMPLETE | Basis for 60–90 day escrow trigger. |
| **Filing Date Tracking** | `insolvency_repayment_plans.filed_at` | ✅ Stored | ✅ COMPLETE | Plan submission to court. |
| **Court Approval Date** | `insolvency_repayment_plans.approved_at` | ✅ Stored | ✅ COMPLETE | Triggers post-approval commission recalculation. |
| **Modification Audit Trail** | `rehabilitation_creditors.updated_at` + `updated_by` | ⚠️ Partial | ⚠️ PARTIAL | Timestamps present but no amendment reason field. No version history for amendments. No amendment type classification (D5120/D5121 amendment vs. typo correction). |
| **Client Action Verification** | `insolvency_client_action_items.client_checked_at` + `client_checked_by` + `staff_verified_at` + `staff_verified_by` | ✅ Stored | ✅ COMPLETE | Timestamped confirmation = legal evidence per CLAUDE.md rule 5-8. |
| **RLS (Row-Level Security)** | — | ✅ Defined | ✅ IMPLEMENTED | `010_rls_policies.sql` includes all insolvency tables. Rehabilitation tables in scope per design. |

---

## PART 8: Summary Statistics

### Overall Implementation Completeness

| Category | Implemented | Partial | Missing | Total | Coverage |
|---|---|---|---|---|---|
| **D-Series Forms** | 5 | 2 | 15 | 22 | **23%** |
| **Business Rules** | 5 | 5 | 1 | 11 | **45%** |
| **Reference Tables** | 0 | 1 | 2 | 3 | **0%** |
| **Database Tables** | 12 | 2 | 4 | 18 | **67%** |
| **Document Templates** | 6 | 1 | 1 | 8 | **75%** |

### Critical Gaps (Blocking Full Court Filing)

1. **Non-Estate Property Declaration (D5108)** — Required for trustee estate boundary. Missing entirely.
2. **Exempt Property Application (D5109)** — Required for housing/living goods exemption claims. Missing entirely.
3. **Court Managed Bank Table (별표2)** — Required to validate trustee account against authorized courts. Missing entirely.
4. **Submission Checklist (자료제출목록)** — Required court form. Missing entirely.
5. **Escrow Ledger Tracking** — Post-approval monthly deposits per 처리지침 제7조③. No schema.
6. **Creditor Account Number Registration (D5123)** — Post-approval phase. Missing table with PII protection.
7. **Plan Versioning** — D5121 (amended plans) requires version control; current schema single-version only.
8. **Special Circumstance Documentation** — Living cost / period exceptions lack reason audit fields.

### High-Priority Enhancements (Medium Blocking)

1. **Income Breakdown Detail (D5103)** — Currently aggregate-only; need salary/business/other line items.
2. **Trustee Commission Rule** — No external trustee flag (`has_external_trustee`); no post-approval rate switching.
3. **Lien Holder Classification** — Properties reference "lien_holder text" but should link to insolvency_creditors.classify enum.
4. **Client Action Deadline Tracking** — Action packets have due_date but no escalation/overdue flag.

### Low-Priority (Informational / Reference)

1. D5112 (Simplified Plan) — Can be deferred if case volume stays below threshold.
2. D5115–D5117 (Income Certificates / Affidavits) — Can integrate gradually via document_ingestion_jobs.
3. D5118/D5119 (Creditor Information Requests) — Workflow can be tracked via case_documents + annotations.
4. Credit Bureau Notification (제18조) — Can be queued to external notification service without blocking filing.

---

## Recommendations for Next Phase

1. **Immediate (Phase 1):**
   - Add D5108 (Non-estate property table)
   - Add D5109 (Exempt property application table)
   - Implement 별표2 (Court-bank mapping reference)
   - Add `has_external_trustee` boolean to income_settings (COPILOT_TASK requirement)
   - Add escrow ledger tracking fields

2. **Short-term (Phase 2):**
   - Implement D5123 (Creditor account registry with PII masking)
   - Add plan versioning for D5121 amendments
   - Enhance living_cost_override_reason and special_circumstance_approved_by fields
   - Create D5103 detailed breakdown table (or migrate from aggregate format)

3. **Medium-term (Phase 3):**
   - Implement self-referential checklist generation (자료제출목록) by court
   - Add post-approval commission rate switching
   - Implement D5124/D5125 (bond dispute tracking)
   - Add credit bureau notification queue

4. **Integration (Phase 4):**
   - Link AI extraction results (insolvency_creditors) to rehabilitation_creditors confirmation workflow
   - Implement document submission checklist UI with status tracking
   - Add case filing status state machine (draft → submitted → approved → escrow → closed)

---

## Appendix: Field-Level Missing List (For Developers)

### New Tables Required
```sql
rehabilitation_non_estate_properties  -- D5108
rehabilitation_exempt_property_requests  -- D5109
court_managed_banks_reference  -- 별표2
trustee_fee_schedule  -- 별표1 (enhance insolvency_ruleset_constants)
document_submission_checklist  -- 자료제출목록
creditor_account_registry  -- D5123 (PII masked)
rehabilitation_income_settings_versions  -- Plan amendments (D5121)
```

### New Fields (Existing Tables)
```sql
-- rehabilitation_applications
-- (none critical; all major fields present)

-- rehabilitation_income_settings
ADD COLUMN has_external_trustee boolean DEFAULT false;  -- COPILOT_TASK P0
ADD COLUMN escrow_start_date date;  -- 처리지침 제7조③
ADD COLUMN escrow_monthly_amount bigint;
ADD COLUMN escrow_status text CHECK (...);  -- pending/active/completed
ADD COLUMN escrow_account_bank_name text;
ADD COLUMN escrow_account_number text;  -- masked
ADD COLUMN living_cost_override_reason text;  -- 처리지침 제7조②
ADD COLUMN special_circumstance_approved_by uuid REFERENCES profiles(id);
ADD COLUMN special_circumstance_approval_date timestamptz;
ADD COLUMN court_approval_for_extended_period timestamptz;  -- 제8조① exception

-- rehabilitation_properties
ADD COLUMN lien_holder_creditor_id uuid REFERENCES insolvency_creditors(id);  -- D5101 enhancement

-- rehabilitation_creditors
ADD COLUMN amendment_reason text;  -- D5120/D5121 tracking
ADD COLUMN amendment_type text CHECK (...);  -- type/typo/objection_resolved/...
ADD COLUMN is_amendment boolean DEFAULT false;

-- rehabilitation_affidavits
-- (complete; no changes needed)

-- rehabilitation_family_members
-- (complete; no changes needed)

-- rehabilitation_secured_properties
-- (complete; no changes needed)

-- insolvency_repayment_plans
ADD COLUMN court_case_number_final text;  -- assigned after approval
ADD COLUMN trustee_final_name text;  -- assigned by court
ADD COLUMN trustee_final_contact text;
```

---

**Document Prepared:** 2026-04-10 Analysis
**Next Review:** Upon completion of Phase 1 enhancements
