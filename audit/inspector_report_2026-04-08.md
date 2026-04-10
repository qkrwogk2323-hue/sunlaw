# 검사관 보고서 — COLAW 스캔 + VS 하드코딩 진단

- **작성일**: 2026-04-08
- **작성자**: 검사관 (read-only verifier)
- **권한 경계**: COLAW 클릭 0회, VS DB write 0회, 사용자 승인 전 어떠한 수정도 수행 X
- **대상**: 운영자 / 0092 마이그레이션 작성자 / 프론트엔드 수정자

---

## 0. 검사관 의견 요약 (TL;DR)

1. **COLAW 90건 어디에도 "72개월"은 존재하지 않습니다.** VS DB의 `repay_months=72` 51건은 전부 import script가 존재하지 않는 필드명을 읽어 주입한 garbage 값입니다. 법정(채무자회생법 제611조 제5항) 상한 60개월을 넘기므로 법리적으로도 불가능한 값입니다.
2. **기준중위소득 60%가 하드코딩되어 사용자가 조정할 수 없습니다.** 60%는 권장선이지 절대 하한이 아니며, 법원은 60% 미만 인정 / 60% 초과 + 추가생계비 모두 수용합니다. 현재 UI는 display-only `<p>`이고, 엔진은 입력값을 60%로 강제 UP-clamp합니다.
3. 두 사안 모두 **P0 (긴급)**으로 판단합니다. 전자는 데이터 무결성, 후자는 업무 수행 자체가 막혀 있습니다.

---

## A. COLAW 90건 풀스캔 — `repaymentperiodsetting` truth

### A-1. 스캔 방법 (재현 가능)

- 도구: `fetch()` same-origin, `credentials=include` (로그인 쿠키 재사용)
- 엔드포인트: `/rescureManage/popupRescureIncomeExpenditure?casebasicsseq={cs}&resurapplicationpersonseq={rs}&diaryyear={dy}`
- 파싱:
  - `input[name="repaymentperiodsetting"]:checked` → `rps` (1~6)
  - `input[name="forcingrepaymentmonth"].value` → `frm` (N개월)
  - `input[name="forcingrepaymentmonthoption"]:checked` → `frmo`
  - `input[name="monthaverageincomemoney"].value` → 월평균소득
- 네트워크: GET 90회 (정상 열람 동작 범위 내), 클릭/저장 0회

### A-2. 분포 (90건)

| option | 개수 | 의미 |
|---|---|---|
| `capital36` | **61** | rps=6 + frm=36 (법정 기본) |
| `capital60` | **21** | rps=1 (원금 5년 60개월) 또는 rps=6 + frm=60 |
| `custom_48` | 1 | 15번 이진호 (rps=6, frm=48) |
| `custom_45` | 1 | 14번 이옥주 (rps=6, frm=45) |
| (empty) | 6 | COLAW에도 설정값 없음 — 68 박복희, 66 임경애, 62 문연자, 43 서동재, 26 조두성, 12 이옥주 |
| **`repay_months=72`** | **0 (90건 중)** | 전체 페이지에 "72" 문자열 전무 |

### A-3. VS DB 진단 (현재값 vs 정답)

- 현재 VS DB: `repay_months=72` 가 51건 (전부 오염)
- 정답(COLAW 원본): 36 = 61건, 60 = 21건, 48 = 1건, 45 = 1건, empty = 6건
- 결론: **51건 72 → 전부 틀림**, empty/custom 제외 약 82건이 case_id별 UPDATE 대상

### A-4. Root cause — import script 버그 위치

| 파일 | 라인 | 버그 |
|---|---|---|
| `scripts/colaw-migration/migrate-colaw-to-vs.ts` | 367 | `tryGet('repayperiod','repaymentmonths','paymentperiod')` — 3개 필드명 모두 COLAW에 존재하지 않음. 실제 필드는 `repaymentperiodsetting` + `forcingrepaymentmonth` |
| (동일) | 581, 675 | `parseInt(income.repay_months) \|\| 60` — 단위 검증 없음, 61개월 이상 불가능 제약 없음 |

### A-5. COLAW enum → VS option 매핑 (0092 마이그레이션 작성자용)

| COLAW rps | frm | VS option | months |
|---|---|---|---|
| 1 | — | `capital60` | 60 |
| 2 | — | `both60` | 60 |
| 3 | N | `capital100_5y` | N (36~60) |
| 4 | — | `capital100_3y` | 36 |
| 5 | — | `full3y` | 36 |
| 6 | 36 | `capital36` | 36 (법정 기본) |
| 6 | 60 | `capital60` | 60 |
| 6 | 45, 48, ... | custom / `capital100_5y` 흡수 | N |

### A-6. Truth 파일

- `audit/colaw_repayperiod_truth.tsv` (90행, case_id별 정답) — 0092 마이그레이션의 `UPDATE ... WHERE case_id = ...` 기준 자료

---

## B. VS 기준중위소득 하드코딩 진단

### B-1. 법령/실무 전제

개인회생 생계비는 기준중위소득 60%를 **기준으로 하되**, 법원은:

- (i) 60% 미만으로 인정 가능
- (ii) 60% 초과 + 추가생계비 인정 가능

따라서 60%는 **권장·출발점**이지 **절대 하한**이 아닙니다. UI는 "숫자 직접 입력 + 60% 기준선 안내" 구조여야 합니다.

### B-2. 현재 소스 상태 (정확한 위치)

| 파일:라인 | 현상 | 영향 |
|---|---|---|
| `src/lib/rehabilitation/median-income.ts:57` | `Math.floor(getMedianIncome(size,year) * 0.6)` — 0.6 리터럴 하드코딩 | rate 파라미터 없음, 50%/55% 등 조정 불가 |
| `median-income.ts:73–81` | `adjustLivingCost`가 입력값 < floor 이면 **floor로 강제 UP-clamp** | 사용자가 60% 미만 입력해도 자동으로 60%로 올림 → 법원 실무와 충돌 |
| `median-income.ts:114–126` | ✅ `computeLivingCost({rate, extraFamilyLowMoney})` 이미 존재 | 엔진 레벨은 OK — UI가 이 함수를 호출하지 않는 게 문제 |
| `src/app/(app)/cases/[caseId]/rehabilitation/tabs/rehab-income-tab.tsx:174–178` | "월 생계비"가 `<p>` display-only, 입력 필드 없음 | 사용자가 값 자체를 수정할 수 없음 |
| `rehab-income-tab.tsx:150` | 섹션 헤더 "기준중위소득 60% (생계비)" — 60% 문자열 라벨에 박힘 | rate 변경해도 라벨이 60% 고정 |
| `rehab-income-tab.tsx:44` (`livingCost` useMemo) | `getLivingCost(year, dependentCount)` → 내부 60% 고정 | `computeLivingCost`로 교체 + rate/extra 상태 추가 필요 |

### B-3. 권장 수정 (최소 변경 원칙)

1. **`median-income.ts:57`** — `minimumLivingCost(size, year, rate = 60)` 로 rate 파라미터 추가. 기본값 60으로 하위 호환 유지.
2. **`median-income.ts:73–81`** — `adjustLivingCost`의 UP-clamp 제거 또는 경고 반환으로 대체.
   ```ts
   // before
   if (input < floor) return { adjusted: floor, wasClamped: true, floor };
   // after
   return { adjusted: input, belowRecommendedFloor: input < floor, floor };
   ```
3. **`rehab-income-tab.tsx`** — 월 생계비 블록을 `<input>`으로 교체:
   - `living_cost` 상태 (직접 입력)
   - `living_cost_rate` 상태 (% 입력, 기본 60)
   - 자동계산 버튼 ("기준중위소득 × rate% 로 채우기")
   - 60% 미만 입력 시 경고 배너: "기준중위소득 60%(권장선) 미만입니다. 법원 인정 사유를 소명서에 기재하세요."
   - 라벨을 "기준중위소득 60% (생계비)" → "생계비 (기준중위소득 ~%)" 동적 표시
   - CLAUDE.md 규칙 준수: 필수 * 표시, `label htmlFor` ↔ `input id`, 형식 힌트
4. **DB 스키마** — `rehab_income_settings`에 `living_cost_rate numeric(5,2) default 60`, `living_cost_override integer null` 추가 검토. 기존 행은 default 60으로 소급 호환.
5. **서버 검증** — `upsertRehabIncomeSettings`에서 `living_cost >= 0`만 검증, 60% 클램프 제거. 60% 미만은 서버 로그 level=info로 감사 가능하게.

### B-4. 확인·주의 사항

| 항목 | 확인 |
|---|---|
| `MEDIAN_INCOME_100` 2022~2026 테이블 | 보건복지부 고시 원본 하드코딩 — 정상, 수정 불필요 |
| `computeLivingCost` rate 기본값 | 100 (60% 아님) — UI에서 60 명시 주입 필요 |
| 기존 저장 데이터 소급 | rate=60 default로 호환 유지 |
| CLAUDE.md 체크리스트 | 3, 6, 9, 10, 13, 14 모두 충족되도록 유지 |

---

## C. 운영자 의사결정 요청 사항

| # | 결정 필요 | 검사관 권고 |
|---|---|---|
| 1 | 0092 마이그레이션을 truth.tsv 기반 case_id별 UPDATE로 작성할지, option enum도 함께 교정할지 | **둘 다 교정** (`repay_months` + `repay_period_option`) |
| 2 | custom_45 / custom_48 2건을 신규 enum으로 받을지, 기존 `capital100_5y`로 흡수할지 | `capital100_5y` + `repay_months = frm` 그대로 (3~60 범위 내) |
| 3 | empty 6건 처리 (COLAW도 비어있음) | VS에서도 null 유지. 덮어쓰지 말 것 |
| 4 | B-3 수정 범위를 P0(긴급)으로 할지 P1로 할지 | UI가 현재 값 수정 자체 불가 → **P0**. 엔진이 이미 준비되어 있어 공수 작음 (1~2 PR) |
| 5 | import script 367/581/675 동시 패치 여부 | **필수**. 재-import 방지용으로 함께 수정 + CI에 `repay_months > 60` assertion 추가 |

---

## D. 첨부 파일

- `audit/colaw_repayperiod_truth.tsv` — 90행 정답 매핑
- `audit/colaw_repayperiod_sample_report.html` — 정희록 표본 시각 재현
- `audit/operator_report_2026-04-08.html` — HTML 버전 보고서
- 본 파일 (`audit/inspector_report_2026-04-08.md`)

---

## E. 검사관 경계 선언

본 보고서 작성 과정에서 검사관은:

- COLAW에서 클릭·저장·수정 0회 (GET fetch만 사용)
- VS DB에 어떠한 write도 수행하지 않음
- 본인이 만들지 않은 staged 변경 건드리지 않음
- 권한 경계: read-only, 운영자 승인 전 자체 판단으로 수정 금지

운영자 승인 후에만 (a) 0092 마이그레이션 PR (b) median-income.ts + rehab-income-tab.tsx 수정 PR (c) import script 패치 PR을 별도 분리해 작성합니다.
