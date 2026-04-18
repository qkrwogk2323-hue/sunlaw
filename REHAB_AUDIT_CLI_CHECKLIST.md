# ⚠️ 아카이브 — 현재 챕터 아님

> **이 문서는 2026-04-12 검수 지시서로, 현재 진행 중인 챕터가 아닙니다.**
> 현재 상태는 `docs/CURRENT_CONTEXT.md`를 참조하세요.
> 검수 결과: `REHAB_FULL_AUDIT_RESULT.md` (78건 중 76 통과, 0 위반).

---

# 개인회생 모듈 전수 검수 — CLI 지시서

> **지시 대상**: Claude Code CLI
> **작성일**: 2026-04-12
> **작성자**: Cowork (브라우저 E2E 테스트 + 코드 정적분석)

---

## 1단계: 체크리스트 자동 생성

1. `CLAUDE.md` 전체를 읽어라
2. `docs/UX_RULES.md`도 읽어라 (전체 규칙 원본)
3. `docs/REHABILITATION_LAW_RULES.md`도 읽어라 (개인회생 전용 규칙)
4. 위 문서들에 나오는 **모든 규칙**을 추출해서, 개인회생 모듈(`src/app/(app)/cases/[caseId]/rehabilitation/` + `src/lib/rehabilitation/`)에 해당되는 항목만 필터링해라
5. 각 규칙마다 아래 형식으로 체크리스트 항목을 만들어라:

```
### RULE-XX: [규칙 이름] [심각도]
- 규칙 출처: CLAUDE.md line X / UX_RULES §X / REHABILITATION_LAW_RULES §X
- 확인 대상 파일: [파일 경로]
- 확인 방법: [grep 명령어 또는 코드 확인 포인트]
- 통과 기준: [구체적 조건]
- 결과: [ ] 통과 / [ ] 위반 — [위반 시 상세 내용]
```

6. 체크리스트를 `REHAB_FULL_AUDIT_RESULT.md`에 저장해라

---

## 2단계: 항목별 검증 실행

1. 체크리스트의 **모든 항목**을 순서대로 검증해라
2. 각 항목마다 실제로 코드를 읽고, grep/검색을 실행하고, 통과/위반을 판정해라
3. 위반이면 **어떤 파일의 어떤 부분이 어떻게 위반인지** 구체적으로 기록해라
4. 모든 항목 검증이 끝나면 결과를 `REHAB_FULL_AUDIT_RESULT.md`에 업데이트해라

---

## 3단계: Cowork이 사전 발견한 위반 사항 (참고용)

아래는 Cowork이 브라우저 E2E 테스트와 코드 분석으로 사전 발견한 항목이다.
CLI는 이 항목들이 본인의 체크리스트에 포함되었는지 확인하고, 빠진 게 있으면 추가해라.

### 사전 발견 위반 목록 (11건)

1. **채권자 가지번호 미적용** — 처리지침 §5 위반. 보증채무/대위변제에 `parent_creditor_id` 연결 안 됨. `4-1`, `6-1`, `8-1` 형식 미표시. CSV 내보내기도 미반영.
2. **저장 버튼 패턴** — 5개 탭 전부 `ClientActionForm` + `SubmitButton` 대신 커스텀 `<button onClick={handleSave}>` 사용.
3. **가족구성원 삭제 시 undo 토스트 누락** — `rehab-applicant-tab.tsx`의 `removeFamilyMember`에서 `softDelete` 후 `undo()` 미호출.
4. **DangerActionButton 미사용** — `rehab-creditors-tab.tsx`에서 import만 하고 커스텀 모달 사용.
5. **전화번호 형식 힌트 누락** — 채권자 탭 3필드 + 문서 탭 1필드에 `placeholder` 없음.
6. **변제계획 탭 필수입력 안내 누락** — `rehab-plan-tab.tsx`에 `* 필수 입력 항목입니다` 없음.
7. **D5106 미리보기 기본 접기 안 됨** — 채권자 탭 하단 미리보기가 항상 펼쳐져 있음 (출력/문서 탭과 중복).
8. **소득 저장 실패** — 월 소득 2,500,000 입력 → 저장(서버 200) → 새로고침 → 0원 복귀. RLS 또는 서버 액션 silent failure 추정.
9. **기준중위소득 60% 공표값 미사용** — `median-income.ts`에서 `Math.floor(기준중위소득 × 60 / 100)` 계산. 보건복지부 공표 고정값을 쓰지 않고 계산해서 1원 차이 발생.
10. **수입명목별 상세(D5103)와 월 소득 중복/미연동** — 두 섹션이 독립적. D5103 합계가 월 소득 필드에 반영 안 됨.
11. **스크롤 시 화이트 스크린** — 페이지 하단 스크롤 시 뷰포트 전체 백색. DOM은 존재하나 시각적 렌더링 안 됨. CSS overflow/height 문제 추정.

### 추가로 CLI가 확인해야 할 영역 (Cowork이 검사 못 한 것)

- 올림/버림 규칙 (CLAUDE.md 개인회생 섹션) — `Math.ceil`, `Math.floor`, `Math.round` 적용 대상별 정확성
- 안분 공식 — `(A) × {(D) / (G)}` [올림] 정확히 구현되었는지
- 라이프니쯔 계수 — 36/48/60개월 값 정확성
- 청산가치 보장 — `현재가치 ≥ 청산가치` 검증 로직
- 변제기간 6규칙 엔진 — `period-setting.ts`의 6가지 설정별 동작
- 크로스 탭 정합성 검증 — 채권자↔재산, 소득↔변제계획, 가족↔부양가족수, 채권자 합계↔요약표
- 채무 한도 자격요건 — 담보부 ≥15억 / 무담보 ≥10억 경고
- 우선변제 100% 보장 — `has_priority_repay=true` 채권 전액 변제 검증
- 마지막 채권자 잔여 보정 — 올림 차이 합계 초과분 흡수
- 서버 권한 가드 — `requireXxxAccess()` 적용 여부
- RLS 정책 — `rehabilitation_*` 테이블 전체
- N+1 쿼리 — 탭 로딩 시 쿼리 패턴
- 민감정보 노출 — 주민번호, 계좌번호 로그/클라이언트 노출 여부
- 번들 최적화 — 무거운 라이브러리 dynamic import 여부

---

## 4단계: 결과 보고

검증 완료 후 `REHAB_FULL_AUDIT_RESULT.md`에 아래 형식으로 요약을 작성해라:

```
## 검수 요약
- 전체 검사 항목: X건
- 통과: X건
- 위반: X건 (🔴 치명 X건, 🟡 중간 X건, 🟢 경미 X건)

## 위반 항목 목록 (우선순위순)
1. ...
2. ...
```

**수정은 하지 마라.** 검수 결과만 기록해라. 수정 여부는 사용자가 결정한다.

---

## 5단계: COLAW 잔재 완전 제거 (즉시 실행)

COLAW(colaw.co.kr)는 이전 시스템이다. Vein Spiral은 **법원규칙(처리지침·가이드·채무자회생법)**과 **CLAUDE.md**가 유일한 규칙 원본이다.
COLAW를 출처나 근거로 참조하는 코드·주석·스키마는 전부 제거하거나, 정식 법원규칙 출처로 치환해야 한다.

### 5-1. `scripts/colaw-migration/` 폴더 삭제 (git rm -r)

```bash
git rm -r scripts/colaw-migration/
```
- 이 폴더는 참고용으로만 로컬에 두라는 지시였으나 코드베이스에 남아있었음
- 포함 파일: migrate-colaw-to-vs.ts, parse-colaw-raw.ts, re-extract-creditors.ts 등 7개 + data/

### 5-2. `scripts/rehab/recompute-mismatch.ts` — `gross_salary` 참조 제거

```
line 215: const monthlyIncome = parseAmount(income.net_salary || income.gross_salary);
→ const monthlyIncome = parseAmount(income.net_salary);
```
- `gross_salary`는 COLAW 전용 컬럼이며 앱에서 사용하지 않음

### 5-3. Migration 스키마 — COLAW 전용 컬럼 제거

**008_rehabilitation.sql:**
- `gross_salary bigint not null default 0` 행 삭제 (line 326)
  - 앱 코드(src/)에서 이 컬럼을 읽거나 쓰는 곳 0건
  - 저장: `net_salary`에 매핑, 로드: `net_salary`에서 읽음
- COLAW 주석 정리 (아래 5-5 참조)

**003_core_tables.sql:**
- `colaw_case_basic_seq text` 컬럼(line 129) — 앱 코드에서 사용 여부 확인 후, 미사용이면 삭제

### 5-4. Migration 012_seed_data.sql — COLAW backfill SQL 제거

- line 232~336 범위: "COLAW REPAYMENT PERIOD TRUTH BACKFILL" 섹션 전체 삭제
- 84건 truth data, colaw #N 매칭 로직 등 — 이미 실행된 시드이며 앱 동작에 불필요

### 5-5. Migration 008 — COLAW 주석을 법원규칙 출처로 치환

| 현재 주석 | 치환 |
|---|---|
| `-- NOTE: colaw_case_basic_seq는 003_core_tables에 포함` | 삭제 (컬럼 자체 제거 시) |
| `-- 0089: living_cost_rate added with default 100 (colaw semantics)` | `-- 생계비율: 처리지침 §7②, 기본 100 = 기준중위소득 60%` |
| `-- COLAW 필드 (0089: living_cost_rate, 0090: period_setting)` | `-- 생계비율(처리지침 §7②) + 변제기간설정(CLAUDE.md §변제기간 6규칙)` |
| `colaw lowestlivingmoneyrate (%)...` (column comment) | `생계비율(%) — baseline60(=기준중위소득×60%) × rate/100. 기본100=60%. 처리지침 §7②` |
| `colaw repaymentperiodsetting (1~6...)` (column comment) | `변제기간설정 (1~6 자동결정 규칙). 기본6=원금만 변제. CLAUDE.md §변제기간 6규칙` |
| `COLAW 마이그레이션 시 60개월로 잘못 설정된 건 보정` | `법적 기본 36개월(법 §611, 처리지침 §8)` |

### 5-6. src/ 앱 코드 — COLAW 주석을 법원규칙 출처로 치환 (~30건)

**치환 규칙:**
| 패턴 | 치환 대상 |
|---|---|
| `colaw 형식` | `법원서식 D51xx` (해당 서식번호로) |
| `colaw anatomy §N.N` | `처리지침 §N` 또는 `가이드 p.N` (해당 조문으로) |
| `colaw lowestlivingmoneyrate` | `생계비율(처리지침 §7②)` |
| `colaw repaymentperiodsetting` | `변제기간설정(CLAUDE.md §변제기간 6규칙)` |
| `colaw 의미론` | `처리지침 기준` 또는 삭제 |
| `colaw 생계비 공식` | `생계비 공식(처리지침 §7②, 가이드 p.37)` |
| `colaw 핸들러 분석` | 삭제 또는 `채권분류(CLAUDE.md §채권자 분류 3경로)` |
| `colaw B_29 page 13` | `가이드 §2(변제율)` |

**대상 파일 목록 (전수):**
1. `src/lib/rehabilitation/document-generator.ts` — ~10건
2. `src/lib/rehabilitation/median-income.ts` — ~5건
3. `src/lib/rehabilitation/monthly-available.ts` — ~5건
4. `src/lib/rehabilitation/period-setting.ts` — 1건
5. `src/lib/rehabilitation/creditor-classification.ts` — 1건
6. `src/lib/rehabilitation/rounding.ts` — 1건
7. `src/lib/rehabilitation/repayment-calculator.ts` — 2건
8. `src/lib/rehabilitation/repayment-rate.ts` — 1건
9. `src/app/(app)/cases/[caseId]/rehabilitation/tabs/rehab-income-tab.tsx` — 2건

### 5-7. `colawTotalTarget` 변수명 개명

**파일**: `src/lib/rehabilitation/document-generator.ts` (line 1985, 1989)
```ts
// 현재
const colawTotalTarget = Number(incomeSettings.total_repay_amount) || 0;
totalTarget: colawTotalTarget > 0 ? colawTotalTarget : undefined,

// 변경
const savedTotalTarget = Number(incomeSettings.total_repay_amount) || 0;
totalTarget: savedTotalTarget > 0 ? savedTotalTarget : undefined,
```

### 5-8. 라이브 DB — COLAW 전용 컬럼 drop

스키마 파일 수정 후, 라이브 DB에도 반영해야 한다:
```sql
ALTER TABLE rehabilitation_income_settings DROP COLUMN IF EXISTS gross_salary;
-- colaw_case_basic_seq는 cases 테이블에서 사용 여부 확인 후 drop
```
⚠️ **이 SQL은 사용자 승인 후 실행할 것** — 데이터 손실 가능성 확인 필요

### 5-8-1. 추가 COLAW 잔재 자체 탐색

위 목록은 Cowork이 발견한 항목이다. **CLI는 위 목록에 없는 COLAW 잔재도 직접 찾아서 제거해라.**

탐색 방법:
```bash
# 전체 프로젝트에서 colaw 관련 키워드 탐색
grep -ri "colaw" . --include="*.ts" --include="*.tsx" --include="*.sql" --include="*.md" --include="*.json" | grep -v node_modules | grep -v .next | grep -v REHAB_MODULE_AUDIT | grep -v REHAB_AUDIT_CLI_CHECKLIST
# gross_salary 참조
grep -ri "gross_salary" . --include="*.ts" --include="*.tsx" --include="*.sql" | grep -v node_modules
# COLAW 전용 변수명/함수명 (colaw prefix)
grep -rn "colaw[A-Z_]" src/ --include="*.ts" --include="*.tsx"
# 0089, 0090 등 squash 전 migration 번호 참조
grep -rn "0089\|0090\|0092\|0093\|0095" supabase/ --include="*.sql"
```

발견된 항목은 위 5-1~5-7 규칙에 따라 동일하게 처리해라:
- 스키마/코드에서 COLAW 전용 → 삭제
- 주석에서 COLAW 출처 → 법원규칙(처리지침/가이드/법조문) 출처로 치환
- 변수명에 colaw → 의미 기반 이름으로 개명

### 5-9. 검증

COLAW 잔재 제거 후 아래를 검증해라:
```bash
# 1. 코드에 colaw 참조 0건 확인
grep -ri "colaw" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules
# 2. gross_salary 참조 0건 확인
grep -ri "gross_salary" src/ scripts/ supabase/ --include="*.ts" --include="*.tsx" --include="*.sql"
# 3. typecheck 통과
npx tsc --noEmit
# 4. build 통과
npm run build
```

모든 검색 결과가 0건이고 빌드 통과하면 완료.
