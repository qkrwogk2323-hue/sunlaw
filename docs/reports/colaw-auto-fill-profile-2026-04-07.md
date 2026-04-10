# colaw 자동작성 로직 데이터 프로파일

> 채증일: 2026-04-07
> 채증자: Claude (P1-10 후속)
> 대상: colaw.co.kr 개인회생 + 개인파산 자동작성 시스템

## Overview

| 항목 | 개인회생 | 개인파산 |
|---|---|---|
| 진입점 | `/documentManage/rescurMainList` | `/documentManage/documentBankruptList` |
| popup 네임스페이스 | `/rescureManage/popup*` | `/bankruptcyManage/popup*` |
| 식별자 키 | `casebasicsseq + diaryyear + resurapplicationpersonseq` | `casebasicsseq + diaryyear + bankruptapplicantseq` |
| 탭 키 파라미터 | `tabname` | `tabname + division` |
| 리포트 엔진 | Clipsoft ClipReport (mssql) | Clipsoft ClipReport4 (mssql) |
| 리포트 템플릿 | `B_*` (B_27, B_28, B_29, B_30, B_31 …) | `C_*` (C_2, C_3, C_5, C_6, C_9, C_12, C_15, C_17, C_18) |
| 리포트 호출 URL | `report.colaw.co.kr/ClipReport/JavaOOFGeneratorChange_Popup.jsp` | `report.colaw.co.kr/ClipReport4/JavaOOFGeneratorChange4_Popup.jsp` |

## 1. 개인회생 (Rehabilitation)

### 1.1 진입 + 케이스 식별

```
GET /documentManage/rescurMainList
→ 케이스 행 클릭 → form.submit → /rescureManage/popupRescureApplication
hidden inputs:
  casebasicsseq, diaryyear, resurapplicationpersonseq, tabname, companycode
```

### 1.2 탭 = popup 엔드포인트 (회생)

| 탭 라벨 | URL | tabname |
|---|---|---|
| 신청인 | `/rescureManage/popupRescureApplication` | `application` |
| 채권자 | `/rescureManage/popupRescureCreditor` | `creditor` |
| 재산 | `/rescureManage/popupRescureProperty` | `property` |
| 수입지출/변제기간 | `/rescureManage/popupRescureIncomeExpenditure` | `income` |
| 진술서 | `/rescureManage/popupRescureAffidavitList` | `affidavit` |
| 변졔계획안10항 | `/rescureManage/popupRescurePlanSection` | `plansection` |
| 자료제출목록 | `/rescureManage/popupRescureDataSubmission` | `caseinfo` |

### 1.3 핵심 저장 필드 (수입지출/변제기간)

| 필드 | 의미 | 김한경 케이스 값 |
|---|---|---|
| `monthaverageincomemoney` | 월평균소득 | 2,100,000 |
| `yearchangeincomemoney` | 연환산 소득 | 25,200,000 |
| `lowMoney` / `maxMoney` | 기준중위 / 1.5배 상한 | 1,025,695 / 1,538,543 |
| `lowestlivingmoney` | 최저생계비 | 1,538,543 |
| `lowestlivingmoneyrate` | 기준 배율 (×100) | 150 |
| `nowvalue` | **현재가치 L (서버 저장)** | **18,961,470** |
| `leibniz` | **라이프니츠 계수 (n−3 원값)** | **30.7719** |
| `repaymentperiodsetting` | 변제기간 설정 (1~6) | 6 |
| `forcingrepaymentmonth` | 강제 변제개월수 | 36 |
| `forcingrepaymentmonthoption` | 옵션 (1~3) | 1 |
| `additionalsetting2/3/4/5` | 부가 설정 플래그 | on |
| `interestreportdisplay` | 이자 보고 표시 | on |
| `paymentratepointdisplay` | 변제율 소수점 표기 | 0 (정수) |

**라이프니츠 검증:**
저장값 30.7719 + 3 = 33.7719 → `561,457 × 33.7719 = 18,961,469.66 → round 18,961,470` ✅

### 1.4 K (총변제예정액) 산출 위치

- colaw JS / DB / 위 income 페이지 어디에도 K 필드 **없음**
- "변제계획안" 인쇄 버튼 → ClipReport 호출:
  ```
  https://report.colaw.co.kr/ClipReport/JavaOOFGeneratorChange_Popup.jsp
    crfName=B_29
    crfDbName=mssql
    crfHwpType=H
    crfParams=casebasicsseq:CS^companycode:CC^diaryyear:DY^resurapplicationpersonseq:RS^reportprintexcept:1
  ```
- **K는 ClipReport mssql 쿼리/리포트 템플릿(B_29) 내부 수식이 산출** → colaw 도메인 밖, JS 추적 불가

### 1.5 회생 ClipReport 템플릿 (이전 채증)

| crfName | 의미 |
|---|---|
| `B_27` | 개시신청서 |
| `B_28` | 위임장 |
| `B_29` | **변제계획안 (K 산출 핵심)** |
| `B_30` | 위임인확인서 |
| `B_31` | 정보수신 |

### 1.6 ajax 엔드포인트 (회생)

```
POST /rescureManage/ajaxResurEstateExemptionSum
POST /rescureManage/ajaxExpensesLivingMoney
POST /rescureManage/ajaxInsertPlansectionInfo
POST /rescureManage/ajaxUpdatePlansectionInfo
POST /rescureManage/ajaxDeletePlansectionInfo
```

---

## 2. 개인파산 (Bankruptcy)

### 2.1 진입 + 케이스 식별

```
GET /documentManage/documentBankruptList
→ 신청인명 클릭 → form.submit → /bankruptcyManage/popupBankruptcyApplication
hidden inputs:
  bankruptapplicantseq, casebasicsseq, diaryyear, tabname, division
```

식별자 차이: 회생의 `resurapplicationpersonseq` 자리에 `bankruptapplicantseq`. `division` 파라미터(`case` 등)가 추가.

### 2.2 탭 = popup 엔드포인트 (파산)

| 탭 라벨 | URL | li 클래스 (tabname) |
|---|---|---|
| 신청서 | `/bankruptcyManage/popupBankruptcyApplication` | `application` |
| 진술서 | `/bankruptcyManage/popupBankruptcyAffidavitList` | `affidavit` |
| 채권자 | `/bankruptcyManage/popupBankruptcyCreditList` | `credit` |
| 재산 | `/bankruptcyManage/popupBankruptcyPropertyList` | `property` |
| 생활상황 | `/bankruptcyManage/popupBankruptcyLifeStyleList` | `lifestyle` |
| 수입지출 | `/bankruptcyManage/popupBankruptcyIncomeExpense` | `incomeexpense` |
| 자료제출 | `/bankruptcyManage/popupBankruptcyDataSubmission` | `datasubmission` |

DOM 셀렉터: `a.nav-link.bankrupt_head_nav`

### 2.3 ClipReport 전체인쇄

```
https://report.colaw.co.kr/ClipReport4/JavaOOFGeneratorChange4_Popup.jsp
  crfName  = C_18^C_17^C_9^C_2^C_3^C_15^C_5^C_6^C_12   (^ 구분 9개 템플릿 합본)
  crfDbName= mssql
  crfHwpType= H
  crfParams= casebasicsseq:CS^companycode:CC^diaryyear:DY^bankruptapplicantseq:BA^UPDOWN:?
```

회생과 비교한 차이:
- 엔진 버전: ClipReport → **ClipReport4**
- 단일 템플릿(B_29) vs **9개 합본 출력 (C_2/3/5/6/9/12/15/17/18)**
- 추가 파라미터 `UPDOWN`

C_* 각 템플릿 의미는 출력 PDF/HWP 헤더로 식별 필요 (다음 채증 단계).

### 2.4 회생 ↔ 파산 명명 규칙 매핑

| 개념 | 회생 | 파산 |
|---|---|---|
| 신청 | `Application` | `Application` |
| 진술서 | `AffidavitList` | `AffidavitList` |
| 채권자 | `Creditor` | `CreditList` |
| 재산 | `Property` | `PropertyList` |
| 생활 | (수입지출에 통합) | `LifeStyleList` (분리) |
| 수입지출 | `IncomeExpenditure` | `IncomeExpense` |
| 자료제출 | `DataSubmission` | `DataSubmission` |
| 변제계획 | `PlanSection` | (없음 — 파산은 면책이므로) |

---

## 3. Data Quality Issues

| Severity | 항목 | 영향 |
|---|---|---|
| 🔴 BLOCKING | K(총변제예정액) 산출이 ClipReport 서버측 mssql/리포트 템플릿 내부에 있음. JS 채증으로 역공학 불가. | 회생 변제계획안 K값 100% 재현은 외부 리포트 PDF 캡처/파싱 없이는 불가능 |
| 🟠 ALERT | 회생 K vs L×months 차이 (김한경 +96원) | ClipReport 회차분배 ceil 흡수가 원인. Vein은 `buildAdjustedSchedule(totalTarget)` 외부 주입으로 흡수 |
| 🟡 WARN | 회생 1개 케이스만 채증 완료. setting≠6, 48mo, 60mo 미검증 | L 공식 일반화 신뢰도 부족. 추가 케이스 1건씩 권장 |
| 🟡 WARN | 파산 C_* 9개 템플릿 의미 미식별 | 파산 자동작성 포팅 시 우선순위/누락 위험 |
| 🟢 NOTE | 회생/파산 모두 cookie 기반 자동로그인. 별도 로그인 URL 없음 | 채증 재현 시 `/documentManage/...`로 직접 진입 |

---

## 4. Vein Spiral 포팅 결정 (현재 시점)

### 회생 (확정)

- `LEIBNIZ_REHAB[36] = 33.7719` (= 저장값 30.7719 + 3) **유지**
- `period-setting.ts totalScheduled = monthly × months` 단순곱셈 **유지**
- K 보정은 `buildAdjustedSchedule({totalTarget})` 외부 주입 경로로만
- 가설 A (라이프니츠 역산 K) **폐기**
- 코드 수정 0건. host HEAD `6394256` 그대로

### 파산 (미착수)

- 최우선 작업: C_* 9개 템플릿 각각의 출력물 제목 확인 → 회생 B_27~B_31과 유사 매핑
- 식별자 구조: `bankruptapplicantseq` + `division` 파라미터 추가
- 라이프니츠 산식 없음 (변제계획 없음). 대신 면책 / 자유재산 확장 / 압류금지 검증 로직 발굴 필요

---

## 5. Recommended Next Investigations

1. **파산 C_* 템플릿 매핑** — 신청서/진술서/채권자/재산/생활/수입지출 각 탭에서 인쇄 버튼 캡처 → C_xx → 한글 문서명 매핑
2. **파산 income/expense 필드 채증** — `popupBankruptcyIncomeExpense` 페이지의 input 전수조사 (회생 income과 동일 패턴 예상)
3. **파산 진술서/채권자 필수 필드 채증** — 자동작성 폼 스키마 확정용
4. **회생 추가 케이스 채증** — setting≠6, 48mo, 60mo 각 1건 (L 공식 일반화 검증)
5. **파산 사건 7번 재현 검증** — 최근 등록 11건 중 1건을 골라 ClipReport 출력 PDF 다운로드 → C_* 매핑 확정

---

## Appendix: 채증 케이스 식별자

| 구분 | 신청인 | 식별자 |
|---|---|---|
| 회생 | 김한경 | `cs=5640948, dy=2025, rs=210485` |
| 파산 | 이경호 | `ba=56308, cs=5765514, dy=2026` |

법원 제출용 변제계획안/파산신청서는 주민번호 포함이 정상이며, 본 보고서에는 주민번호를 기록하지 않았습니다.
