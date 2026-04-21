# 개인회생 자동작성 — 문서 매트릭스

> 작성: 2026-04-21
> 목적: 문서별로 입력 원천·계산 원천·출력 스냅샷·생성 함수·검증 규칙·법원 차이·저장 여부를 한 곳에 고정.
> 이 문서가 없으면 개발자는 "어느 값이 어느 문서에 들어가야 하지"를 사람 머리로 처리하게 됨.

---

## 1. 문서 생성 매트릭스 (16종)

| # | 문서명 | DocumentType | 생성 함수 | 입력 aggregate | 계산 함수 | 법원 공통 | case_documents 저장 | 테스트 |
|---|---|---|---|---|---|---|---|---|
| 1 | 표지 | `cover_page` | `generateCoverPage` | application | — | ✅ | ⚠️ persisted flag | — |
| 2 | 개시신청서 | `application` | `generateApplication` | application, incomeSettings | `computeMonthlyAvailable`, `decideRepaymentPeriod` | ✅ | ⚠️ | — |
| 3 | 위임장 | `delegation` | `generateDelegation` | application | — | ✅ | ⚠️ | — |
| 4 | 변호사위임장 | `delegation_with_attorney` | `generateDelegationWithAttorney` | application | — | ✅ | ⚠️ | — |
| 5 | 변호사선임장 | `attorney_designation` | `generateAttorneyDesignation` | application | — | ✅ | ⚠️ | — |
| 6 | 금지명령신청서 | `prohibition_order` | `generateProhibitionOrder` | application, creditors | — | ✅ | ⚠️ | — |
| 7 | 중지명령신청서 | `stay_order` | `generateStayOrder` | application, creditors, properties | `calculateLiquidationValue` | ✅ | ⚠️ | — |
| 8 | 채권자목록 (D5106) | `creditor_list` | `generateCreditorList` | creditors, securedResults | `calculateSecuredAllocations`, `classifyCreditor` | ⚠️ 법원별 차이 | ⚠️ | — |
| 9 | 채권자요약표 | `creditor_summary` | `generateCreditorSummary` | creditors, securedResults | `getSecuredAllocationTotals` | ✅ | ⚠️ | — |
| 10 | 재산목록 (D5101) | `property_list` | `generatePropertyList` | properties, propertyDeductions | `calculateLiquidationValue` | ✅ | ⚠️ | — |
| 11 | 수입지출목록 (D5103) | `income_statement` | `generateIncomeStatement` | incomeSettings, familyMembers | `computeLivingCost`, `getMedianIncome` | ⚠️ 연도별 | ⚠️ | — |
| 12 | 진술서 (D5105) | `affidavit` | `generateAffidavit` | affidavit, creditors, properties | — | ✅ | ⚠️ | — |
| 13 | 변제계획안 (D5110/5111) | `repayment_plan` | `generateRepaymentPlan` | creditors, incomeSettings, properties, planSections | `calculateRepayment`, `generateRepaySchedule`, `discountByLeibniz` | ⚠️ 법원별 | ⚠️ | — |
| 14 | 자료제출목록 | `document_checklist` | `generateDocumentChecklist` | application | — | ❌ 법원별 추가서류 | ⚠️ | — |
| 15 | 재단미속재산목록 (D5108) | `excluded_property_list` | `generateExcludedPropertyList` | properties | — | ✅ | ⚠️ | — |
| 16 | 면제재산결정신청 (D5109) | `exempt_property_application` | `generateExemptPropertyApplication` | application, properties | — | ✅ | ⚠️ | — |

**범례**:
- ⚠️ `case_documents 저장`: `generateRehabDocument` 서버 액션이 storage 업로드 + case_documents row 생성을 시도하지만, `persisted` flag가 false인 경우 Blob 폴백 다운로드만 제공.
- 테스트 열: golden case 기반 출력 동일성 테스트. 현재 0건.

---

## 2. 계산 모듈 매트릭스 (10종)

| 모듈 | 핵심 함수 | 입력 | 출력 | 규칙 상수 위치 | 버전화 필요 |
|---|---|---|---|---|---|
| `median-income.ts` | `getMedianIncome()`, `computeLivingCost()` | householdSize, year, livingCostRate | 가구별 기준중위소득, 생계비 | 파일 내 `MEDIAN_INCOME_100/60` (2022~2026) | ✅ 연도별 |
| `monthly-available.ts` | `computeMonthlyAvailable()` | income, household, year, rate, trustee | 월가용소득 | 생계비율 기본 100 | — |
| `secured-allocation.ts` | `calculateSecuredAllocations()` | properties[], creditors[] | 담보물건별 채권자 배분 | 환가비율: 부동산70/자동차50/임차보증금100 | ⚠️ 법원별 |
| `property-valuation.ts` | `calculateLiquidationValue()` | items[], deductions | 14카테고리별 청산가치 | 공제: 예금·보험 250만, 퇴직금 1/2 | — |
| `creditor-classification.ts` | `classifyCreditor()` | creditor | 채권 분류 (우선/별제/일반/미확정) | 3경로 분류 규칙 | — |
| `repayment-calculator.ts` | `calculateRepayment()` | RepaymentInput | RepaymentResult (월변제, 변제율, 기간) | 담보15억/무담보10억 한도 | — |
| `repayment-period.ts` | `decideRepaymentPeriod()` | monthlyPayment, liquidationValue | 36/48/60개월 자동 결정 | 청산가치 보장 테스트 | — |
| `period-setting.ts` | `decidePeriodSetting()` | setting(1~6), creditors, monthly | 6규칙 기반 target | 6가지 변제기간 규칙 | — |
| `schedule-generator.ts` | `generateRepaySchedule()` | creditors, monthly, months | 채권자별 월변제액 배분 | 3배분방식: sequential/combined/tieredTax | — |
| `leibniz.ts` | `presentValue()` | monthlyPayment, months | 현재가치 (라이프니쯔) | 36=33.7719, 48=43.9555, 60=53.6433 | — |

---

## 3. 입력 Aggregate 정의 (8개)

| Aggregate | DB 테이블 | 핵심 필드 | 문서 소비처 |
|---|---|---|---|
| **Applicant** | `rehabilitation_applications` | 성명, 주민번호, 주소, 법원, 대리인, 사건번호 | 1~7, 14 |
| **CreditorSettings** | `rehabilitation_creditor_settings` | 안분기준, 변제기간설정, 산정기준일 | 8, 13 |
| **Creditors** | `rehabilitation_creditors` | 채권자명, 원금, 이자, 분류, 보증관계 | 8, 9, 12, 13 |
| **SecuredProperties** | via `secured-allocation.ts` | 담보물건, 환가비율, 순위 | 8, 9, 13 |
| **Properties** | `rehabilitation_properties` + `_deductions` | 14카테고리, 금액, 공제 | 7, 10, 13, 15, 16 |
| **IncomeAndExpenses** | `rehabilitation_income_settings` | 월소득, 생계비율, 추가생계비, 가족수 | 2, 11, 13 |
| **Affidavit** | `rehabilitation_plan_sections` (type='affidavit') | 자유기술 항목 | 12 |
| **PlanSections10** | `rehabilitation_plan_sections` (type='plan') | 10개 항목 편집 가능 텍스트 | 13 |

---

## 4. 버전화 필요 규칙 상수

| 규칙 | 현재 위치 | 변동 주기 | 법원별 차이 |
|---|---|---|---|
| 기준중위소득 60% | `median-income.ts` 상수 | 매년 1월 | ❌ 전국 동일 |
| 법원별 입금은행 코드 | 참조 HTML에만 존재 | 비정기 | ✅ 법원별 다름 |
| 법원별 추가 제출서류 | 참조 HTML에만 존재 | 비정기 | ✅ 서울/대전/대구/부산/청주/강릉 |
| 환가비율 기본값 | `secured-allocation.ts` 상수 | 드묾 | ⚠️ 법원 실무 차이 |
| 라이프니쯔 계수 | `leibniz.ts` 상수 | 법 개정 시 | ❌ 전국 동일 |
| 채무 한도 (15억/10억) | `repayment-calculator.ts` 상수 | 법 개정 시 | ❌ 전국 동일 |

---

## 5. 현재 상태 → 목표 Gap

| 영역 | 현재 | 목표 | Gap |
|---|---|---|---|
| 문서 생성 | `generateDocument()` → HTML string 반환 | 입력 스냅샷 → 계산 스냅샷 → payload → HTML → storage → case_documents | 스냅샷 중간 레이어 없음 |
| 규칙 관리 | 계산 모듈 안에 상수 하드코딩 | `src/lib/rehabilitation/rules/` 분리, 연도·법원별 버전 | rules/ 디렉터리 없음 |
| 법원별 차이 | 앱에 미반영 (참조 HTML에만) | 법원 코드 기반 조건 분기 | 입금은행·추가서류 미구현 |
| 입출력 분리 | creditors 배열이 입력이자 출력 | 입력 모델 → 출력 모델 (표기용 순번, 안분 결과) 분리 | 혼재 |
| 테스트 | 문서별 unit test 일부 | golden case 10개 사건 단위 출력 동일성 | 0/10 |
| 재현성 | "그때그때 그리기" (매번 계산) | 스냅샷 기반 재현 (같은 입력 → 항상 같은 출력) | 스냅샷 저장 없음 |

---

## 6. 실행 우선순위

| 순서 | 대상 | 이유 | 예상 |
|---|---|---|---|
| **1차** | D5106 채권자목록 엔진화 | 가장 구조적, 패치 흔적 가장 많음 | 1~2일 |
| **2차** | 변제계획안 10항 자동화 | 채권자·재산·수입지출 결과 기반 문구 자동 생성 | 1~2일 |
| **3차** | 자료제출목록 법원별 규칙 | 규칙 엔진 분리 성과 즉시 확인 | 반나절 |
| **4차** | 금지명령·중지명령 자동생성 | 본안 데이터 안정화 후 | 반나절 |
| **병렬** | `rules/` 디렉터리 분리 | 1~4차 진행하면서 점진적으로 | 각 단계에 포함 |
| **병렬** | golden case 10개 세트 | 1차부터 사건 단위 테스트 시작 | 각 단계에 포함 |
