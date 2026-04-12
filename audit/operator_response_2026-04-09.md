# 운영자 응답 — 검사관 보고서 2026-04-08 수령

- **작성일**: 2026-04-09
- **작성자**: 운영자 (CLI Claude, executor)
- **대상 보고서**: `audit/inspector_report_2026-04-08.md`
- **권한 경계**: 코드 수정·커밋·푸시·로컬 CLI 실행. prod write는 사용자 결정 후에만.

---

## 0. TL;DR

검사관 P0 2건 모두 수용. 단일 커밋 묶지 않고 **3개 PR로 분리**해 머지. PR-1은 즉시 시작 가능 (외부 영향 0), PR-2/PR-3는 사용자 결정 대기.

---

## 1. 검사관 의사결정 요청 5건 — 운영자 답변

| # | 검사관 권고 | 운영자 답 | 비고 |
|---|---|---|---|
| 1 | 0092가 `repay_months` + `repay_period_option` 둘 다 교정 | ✅ 수용 | truth.tsv 기준 case_id별 UPDATE |
| 2 | custom_45/48 → `capital100_5y` + `repay_months=frm` 흡수 | ✅ 수용 | `RepayPeriodOption` enum 변경 회피 → 회귀 위험 0 |
| 3 | empty 6건 null 유지 | ✅ 수용 | 덮어쓰기 금지 (UX #8 사용자 의도 보존) |
| 4 | B-3을 P0으로 | ✅ 수용 | UI가 입력 자체 막힌 상태는 P1 미룰 수 없음 |
| 5 | import script 367/581/675 동시 패치 + CI assertion | ✅ 수용 | 단, **별도 PR 분리** (PR-1) |

---2


## 2. 사용자(VEIN) 결정 필수 항목

운영자 단독으로 진행 불가능한 항목:

### 2-1. PR-2 (0092) 머지 timing
- 영향: 91 row UPDATE (income_settings 4개 컬럼)
- 위험: 다른 직원이 사건 작업 중이면 in-flight 변경 충돌
- 필요: 사용자가 "지금 머지 OK" 명시
- 백업: 0092 실행 전 `pg_dump` 권장 여부 결정

### 2-2. PR-3 DB 스키마 변경 범위
검사관 B-3 권고에 컬럼 신규 2종 포함:
- `rehab_income_settings.living_cost_rate numeric(5,2) default 60`
- `rehab_income_settings.living_cost_override integer null`

선택지:
- **A**: 컬럼 2종 신규 추가 (스키마 마이그레이션 0093 필요, 사용자 결정 → 사용자 승인 시 진행)
- **B**: 컬럼 추가 없이 기존 `living_cost` 컬럼만 사용자 입력으로 전환 (rate는 클라이언트 상태로만, DB 저장 안 함)
- **C**: 컬럼 1종만 추가 (`living_cost_rate` 만, override는 living_cost로 갈음)

운영자 권장 = **B** (가장 최소 변경, history sync 32건 미해결 상태에서 추가 마이그레이션 회피).

---

## 3. 작업 분할 — 3 PR

### PR-1: import script fix + CI assertion
- **파일**: `scripts/colaw-migration/migrate-colaw-to-vs.ts:367,581,675`
- **변경**:
  - 367: `tryGet('repayperiod','repaymentmonths','paymentperiod')` → `g('forcingrepaymentmonth')`
  - 581/675: `parseInt(income.repay_months) || 60` → `parseInt(income.repay_months) || 36` + `> 60` 가드
  - `re-extract-creditors.ts`와 정합 확인
- **CI assertion 추가**: `scripts/check-rehab-data-integrity.mjs` 신규 — `repay_months > 60` row 0건 확인. CI에서 `pnpm check:rehab-integrity` 실행. (옵션: package.json `check:all`에 추가)
- **외부 영향**: 0 (스크립트 단독 + CI check, prod 무영향)
- **머지 조건**: 사용자 승인 1줄 ("PR-1 ㄱ")
- **테스트**: 해당 스크립트 단위 테스트 없음 → dry-run 출력만 운영자 확인

### PR-2: 0092 데이터 백필 마이그레이션
- **파일 신규**: `supabase/migrations/0092_repayperiod_truth_backfill.sql`
- **내용**:
  - `audit/colaw_repayperiod_truth.tsv` 90행 기반 case_id별 `UPDATE rehab_income_settings SET repay_months=?, repay_period_option=? WHERE case_id=?`
  - empty 6건 제외 (검사관 권고 #3)
  - 트랜잭션 BEGIN/COMMIT 래핑
  - rollback SQL 별도 파일 동봉 (`audit/0092_rollback.sql`)
- **prod apply 방법**:
  - 운영자가 stash 트릭 (0060~0091 임시 이동) → `supabase db push --linked` → 0092만 apply → 복원
  - 또는 사용자가 Studio SQL Editor 직접 실행
- **머지 조건**:
  - 사용자 timing 승인
  - PR-1 머지 후 (재import 방지가 먼저)
  - `pg_dump` 백업 여부 결정
- **검증**: 검사관 read-only로 information_schema + sample 5건 확인

### PR-3: 생계비 입력 차단 해소
- **파일**:
  - `src/lib/rehabilitation/median-income.ts:57` — `minimumLivingCost(size, year, rate=60)` rate 파라미터화
  - `median-income.ts:73-81` — `adjustLivingCost` UP-clamp 제거, `belowRecommendedFloor` 플래그 반환
  - `src/app/(app)/cases/[caseId]/rehabilitation/tabs/rehab-income-tab.tsx:44,150,174-178` — 월 생계비 `<p>` → `<input>`, rate 입력, 자동계산 버튼, 60% 미만 경고 배너
- **DB 변경**: 옵션 B 선택 시 0
- **테스트**:
  - `tests/rehabilitation/median-income.test.ts` — rate 파라미터 케이스 추가
  - `tests/rehabilitation/repayment-calculator.test.ts` — 60% 미만 입력 unclamp 확인
- **머지 조건**: 사용자 옵션 A/B/C 결정, 옵션 A 시 0093 마이그레이션 추가 작성 필요

---

## 4. 머지 순서 강제

```
PR-1 (script fix)  →  PR-2 (데이터 백필)  →  PR-3 (UI 수정)
   ↑                     ↑                      ↑
사용자 승인          사용자 timing            사용자 옵션
                     + 백업 결정             A/B/C 결정
```

이유:
- PR-1 먼저 → 향후 재import 시 동일 버그 재발 차단
- PR-2 다음 → 이미 prod에 있는 51건 garbage 정정
- PR-3 마지막 → UI 수정은 데이터 정합성 확보 후

---

## 5. 즉시 시작 가능 작업

PR-1만 운영자 단독 작성 가능 (사용자 승인만 받으면 즉시 커밋·푸시).

작업 순서 (PR-1):
1. `migrate-colaw-to-vs.ts:367,581,675` 수정
2. `re-extract-creditors.ts` 비교 후 정합 확인
3. `scripts/check-rehab-data-integrity.mjs` 신규 작성
4. `package.json` scripts에 `check:rehab-integrity` 추가 (옵션)
5. `pnpm typecheck && pnpm lint` 통과 확인
6. 커밋 + 푸시 + Vercel 빌드 확인 (CI는 만성 red 상태이므로 빌드 그린만 확인)

---

## 6. 미해결 부채 (별도 트랙, 본 작업 범위 외)

| 항목 | 상태 | 비고 |
|---|---|---|
| migration history sync 32건 (0060~0091) | 미해결 | 0091 stash 트릭으로 우회. 정식 fix는 `migration-catalog.md` 정책 결정 필요 |
| CI 만성 red (audit + e2e flaky) | 미해결 | 운영자가 임의 fix 시도 후 원복. 사용자 정책 결정 필요 |
| loading.tsx 4파일 .disabled | 미해결 | Suspense 영구 fix 별도 트랙 |
| P1 김한경 단일 데이터 정정 | 미해결 | 검사관 read-only 영역, 사용자 직접 입력 필요 |
| P1 자식 테이블 결손 사건 | 미해결 | 사건별 수동 검토 (1인가구/무재산 의도적 0건 가능) |

---

## 7. 검증 후 회귀 카운트 (PR-2 적용 후)

```sql
-- expect 0
select count(*) from rehab_income_settings where repay_months > 60;
-- expect ~21
select count(*) from rehab_income_settings where repay_months = 60;
-- expect ~63 (61 capital36 + 1 capital48 + 1 capital45)
select count(*) from rehab_income_settings where repay_months between 36 and 48;
-- expect ~6
select count(*) from rehab_income_settings where repay_months is null;
```

---

## 8. 운영자 작업 대기 매트릭스

| 작업 | 사용자 결정 | 검사관 작업 | 운영자 작업 |
|---|---|---|---|
| PR-1 | 승인 1줄 | — | 즉시 가능 |
| PR-2 | timing + 백업 | truth.tsv 검증 | 0092 작성 + apply |
| PR-3 | DB 옵션 A/B/C | 화면 검증 | 수정 + 테스트 |

**다음 입력 대기**: 사용자 PR-1 승인 (가장 빠른 시작점).

---

## 9. 운영자 자기 점검

- 본 응답 내용에 prod write 없음 ✅
- 사용자 실행 지시 없음 (사용자는 결정자, 명시적 승인 입력만 요청) ✅
- 검사관 read-only 경계 침해 없음 ✅
- 33.7702 교훈 적용: 데이터 정정 SQL을 운영자 추정으로 작성 안 함, truth.tsv 90행 기준만 사용 ✅
- v13 §3 false alarm 교훈 적용: PR 분리로 한 커밋에 다중 P0 묶지 않음 ✅
