# COLAW ↔ Vein Spiral 일괄 패치 지시서

검증관: read-only 스캔 결과 기반. 실행은 운영자 책임.
일자: 2026-04-08
범위: VS production `rehabilitation_*` 계열 92건 전체

---

## 0. TL;DR

| 결손 항목 | 영향 사건 수 | 비율 |
|---|---:|---:|
| `rehabilitation_income_settings.total_capital = 0` (집계 미실행) | **90 / 92** | 97.8% |
| `repay_period_option = 'capital60'` (legacy default) | **91 / 92** | 98.9% |
| `repay_period_option = 'capital36'` (new default 적용된 row) | **0 / 92** | 0% |
| `income_settings` row 자체 누락 | 1 / 92 | 1.1% |
| `creditors` 전혀 없는 사건 | 4 / 92 (88건만 보유) | 4.3% |
| `properties` 전혀 없는 사건 | 11 / 92 (81건만 보유) | 12.0% |
| `affidavits` 전혀 없는 사건 | 1 / 92 (91건 보유) | 1.1% |
| `family_members` 전혀 없는 사건 | 13 / 92 (79건 보유) | 14.1% |

## 1. COLAW ↔ VS 매칭 결과

- COLAW 개인회생 사건 목록(2025-04-08 ~ 2026-04-08): **90건**
- VS `rehabilitation_applications`: **92건** (= COLAW 90 + 테스트 2: `TestSave`, `김테스트`)
- 신청인명 기준 1:1 매칭: **90 / 90 완전 일치** (동명이인 6쌍 양쪽 동일)
  - 동명이인 쌍: 계승일×2, 김기홍×2, 김한경×2, 이옥주×2, 임경애×2, 조두성×2
- 데이터 원본: `audit/colaw_cases.tsv`, `audit/vs_applications.tsv`

## 2. 사례 기준 검증 (김한경 / b6823d01-5832-49a8-8682-355303a3acf5)

COLAW 7탭 풀스캔 + VS DB 풀스캔 결과 (소스 단일 사건 검증).

### COLAW 측 합계 (정답값)
- 총채무 capital: 62,844,516원
- 별제권(담보) 채무: 10,680,000원 (자동차)
- 별제권 잔존 무담보부: 23,835,499원 (제이비우리캐피탈)
- 무담보 합계 (정책 C: capital - secured collateral): **52,164,516원**
- 가용소득(월): 561,457원
- 변제기간: 36개월
- 예상 총변제액: 561,457 × 36 = 20,212,452원
- 변제율 (정책 C 분모 기준): 20,212,452 / 52,164,516 = **38.74%**

### VS DB 현황 (b6823d01)
- `rehabilitation_applications`:
  - `application_date = 2025-01-02` (COLAW 정답: **2026-01-19**) ❌
  - `repayment_start_date = 2025-04-03` (COLAW 정답: **2026-04-19**) ❌
  - `registered_address` 中 `"2동 401호"` (COLAW 진술서 정답: **`B동 401호`**) ❌
  - `income_type = NULL` ❌
  - `position = "건설업"` (업종이 직책에 들어감) ❌
- `rehabilitation_income_settings`:
  - `gross_salary = 2,100,000` ✅
  - `living_cost = 1,538,543` ✅
  - `repay_months = 36` ✅
  - `repay_period_option = "capital60"` ❌ (정답: capital36)
  - `total_debt / total_capital / total_interest / secured_debt / unsecured_debt / liquidation_value / repay_rate / monthly_repay / total_repay_amount` **모두 0** ❌
- `rehabilitation_creditors`: **13행** (COLAW 정답: **10**) ⚠️ (3 잉여)
- `rehabilitation_properties`: **1행** (COLAW 정답: **12** = 예금 10 + 자동차 1 + 부동산 1) ❌
- `rehabilitation_affidavits`: **0행** ❌
- `rehabilitation_family_members`: **0행** ❌
- `rehabilitation_plan_sections`: 0행 (COLAW 0행, ✅ 일치)

## 3. 전체 92건 확장 검증 (시스템성 결함 확인)

김한경 사건의 결손 패턴은 **단일 데이터 입력 누락이 아니라 마이그레이션/집계 백필 누락**으로 확인됨. 다음 SQL 결과:

```
total_apps         = 92
zero_total_capital = 90    -- 97.8%
capital60_legacy   = 91    -- 98.9%
capital36_new      =  0
missing_income_row =  1
creditors_total    = 1135 rows / 88 cases
properties_total   = 1206 rows / 81 cases
affidavits_total   =   91 rows / 91 cases
family_members     =  219 rows / 79 cases
```

## 4. 일괄 패치 지시 (운영자 실행 항목)

### P0-A: `repay_period_option` 백필
- 마이그레이션 0091은 `default` 만 변경했고 기존 row를 백필하지 않음.
- 별도 백필 마이그레이션 필요:
  ```sql
  -- migration 0092 (예시)
  update public.rehabilitation_income_settings
     set repay_period_option = 'capital36',
         updated_at = now()
   where repay_period_option = 'capital60'
     and lifecycle_status is distinct from 'soft_deleted';
  ```
  - 운영자 사전 확인: 의도적으로 60개월 유지해야 하는 사건 존재 여부.
  - 영향: 91 rows.

### P0-B: `income_settings` 집계 0값 백필
- `total_capital`/`total_interest`/`secured_debt`/`unsecured_debt`/`liquidation_value`/`repay_rate`/`monthly_repay`/`total_repay_amount` 모두 0인 row 90개 → P1 b26b9bc 패치(`document-generator.ts`)는 **표시 시점**에서만 재계산. **DB row 자체는 stale**.
- 운영자 실행:
  1. 변제계획안 PDF 생성 시 사용되는 `recomputeRehabilitationAggregates()` 동등 로직을 일괄 실행하는 RPC/스크립트 작성.
  2. 92건 전체에 대해 `creditors`/`properties` 합계 → `income_settings` 업데이트.
  3. 트랜잭션·소프트삭제 필터 준수 (UX #8, 2-8).

### P0-C: 누락 income_settings row 1건
- `select case_id, applicant_name from public.rehabilitation_applications a where not exists (select 1 from public.rehabilitation_income_settings s where s.case_id=a.case_id);`
- 해당 사건 ID 식별 후, 기본 row insert (`repay_period_option='capital36'`, `lifecycle_status='active'`).

### P1: 자식 테이블 결손 사건 식별
운영자 실행할 추출 SQL:
```sql
-- creditors 0건 사건
select a.case_id, a.applicant_name
  from public.rehabilitation_applications a
 where not exists (select 1 from public.rehabilitation_creditors c where c.case_id=a.case_id);
-- properties 0건
select a.case_id, a.applicant_name
  from public.rehabilitation_applications a
 where not exists (select 1 from public.rehabilitation_properties p where p.case_id=a.case_id);
-- affidavits 0건
select a.case_id, a.applicant_name
  from public.rehabilitation_applications a
 where not exists (select 1 from public.rehabilitation_affidavits af where af.case_id=a.case_id);
-- family_members 0건
select a.case_id, a.applicant_name
  from public.rehabilitation_applications a
 where not exists (select 1 from public.rehabilitation_family_members f where f.case_id=a.case_id);
```
- 각 결손 사건에 대해 COLAW 원본을 1:1 재이관(import)하거나 운영자가 의뢰인에게 보완 입력 안내.
- ⚠️ 일부 사건은 의도적으로 가족/재산 0건일 수 있음(예: 1인가구, 무재산). 무조건 백필 금지. 사건별 수동 검토 필요.

### P2: 김한경 사건 한정 데이터 정정
- `application_date`: 2025-01-02 → **2026-01-19**
- `repayment_start_date`: 2025-04-03 → **2026-04-19**
- `registered_address`: "2동 401호" → "**B동 401호**" (전체 주소 점검)
- `income_type`: NULL → COLAW 진술서 기준 값 입력
- `position`/`industry` 컬럼 분리: "건설업"은 industry, position은 별도 직책
- `creditors` 13행 vs COLAW 10행 → 잉여 3행 식별 후 soft delete (UX #8)
- `properties`: 12건 (예금 10 + 자동차 1 + 부동산 1) 보강
- `affidavits`: 진술서 1건 신규 작성
- `family_members`: COLAW 진술서 가족 명단 기준 입력

### P3: 동명이인 검수
- 6쌍의 동명이인 사건에 대해 COLAW `사건일지번호`와 VS `case_id` 매칭이 정확한지 운영자가 1:1 검증.
- 잘못 매칭되었다면 데이터 교차 오염 가능성 있음.

## 5. 검증 후 회귀 테스트 (PROJECT_RULES v2.0 5-7, 22)

- 백필 마이그레이션 직후 다음 카운트가 0이 되어야 함:
  ```sql
  select count(*) from public.rehabilitation_income_settings
   where repay_period_option = 'capital60';   -- expect 0
  select count(*) from public.rehabilitation_income_settings
   where total_capital = 0
     and case_id in (select case_id from public.rehabilitation_creditors); -- expect 0
  ```
- 변제계획안 PDF 재생성 후 12회 일자, 변제율, 총변제액이 COLAW 원본과 ±1원 이내 일치하는지 김한경 + 임의 5건 표본검사.

## 6. 검증관 안전 boundary 명시

- 검증관은 **read-only**. 본 지시서의 모든 SQL/마이그레이션 실행은 운영자가 수행.
- COLAW 측 팝업 버튼 (저장/인쇄/삭제 등) 일체 클릭 안 했음.
- VS production 측 INSERT/UPDATE/DELETE 일체 실행 안 했음.
- 모든 SQL은 SELECT only.

## 7. 첨부 데이터

- `audit/colaw_cases.tsv` — COLAW 90건 (`번호|신청인|사건일지번호`)
- `audit/vs_applications.tsv` — VS 92건 (`신청인|case_id 8자리`)
- 본 디렉터리는 `audit/` 안에 함께 위치.
