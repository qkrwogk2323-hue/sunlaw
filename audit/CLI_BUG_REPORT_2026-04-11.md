# CLI 버그 리포트 — 검증더미 v3 사건 기반

> **작성**: 검증관 (Cowork)
> **일시**: 2026-04-11
> **대상**: 검증더미 v3 사건 (10명 채권자, 복합 시나리오)
> **수신**: 운영자 (CLI Claude Code)

---

## 개요

검증더미 v3 사건은 국세청 우선변제, 동일담보 3순위 근저당, 일부/전액 대위변제를 포함한 복합 시나리오이다.
UI 검증 결과 아래 7건의 버그를 확인하였으며, 법률 규칙 위반(P0) 2건을 포함한다.

법률 규칙 상세: `docs/REHABILITATION_LAW_RULES.md` (동시 작성)

---

## P0 — 법률 위반 (인가 불가 상태)

### BUG-001: 우선변제채권 100% 미준수

| 항목 | 내용 |
|------|------|
| 심각도 | **P0 — 법률 위반** |
| 위치 | `src/lib/rehabilitation/schedule-generator.ts`, `repayment-calculator.ts` |
| 법적 근거 | 법 §583, §614①, 지침 가이드 p.6 |
| 증상 | `has_priority_repay=true`인 국세청(채권번호 1) 채무가 **17.6%**만 변제됨. 법적으로 **100%** 필수 |
| 원인 | `hasPriorityRepay` 필드가 DB에 존재하지만 `generateRepaySchedule()`, `calculateRepayment()` 어디에서도 **읽지 않음**. `tieredTaxPriority` 모드도 100% 보장 검증 없이 예산 배분만 수행 |
| 수정 방향 | 1) `has_priority_repay=true` 채권은 무조건 100% 변제 보장 <br>2) 가용소득 부족 시 변제기간 연장 또는 에러 표시 <br>3) 계단식 배분(Phase 1→2→3) 적용하되 Phase 1에서 우선채권 완납 보장 |
| 참조 규칙 | `REHABILITATION_LAW_RULES.md` §4 |

### BUG-002: 청산가치 0원 표시

| 항목 | 내용 |
|------|------|
| 심각도 | **P0 — 법률 위반** (청산가치보장원칙 검증 불가) |
| 위치 | 소득·생계비 탭 프론트엔드 → 변제계획 탭 |
| 법적 근거 | 법 §614①④, 가이드 p.5 |
| 증상 | DB에 재산 합계 43.8M~88.8M이 존재하나, UI에 청산가치 **0원**으로 표시. 청산가치보장원칙 비교 불가능 |
| 원인 | 재산목록 → 소득·생계비 탭 → 변제계획 탭으로의 데이터 전달 파이프라인에서 청산가치 누락 |
| 수정 방향 | 재산목록 합계를 변제계획 계산에 자동 연동. D5110/D5111 양식 분기 자동화 |

---

## P1 — 기능 결함

### BUG-003: 변제기간 디폴트 오류 (레거시 91건)

| 항목 | 내용 |
|------|------|
| 심각도 | **P1** |
| 위치 | `rehabilitation_income_settings.repay_period_option` |
| 증상 | 마이그레이션된 91건이 `capital60` (60개월). 법적 기본은 `capital36` (36개월) |
| 원인 | COLAW `repayperiod` value 매핑 시 디폴트를 `1`(capital60)로 잡음 |
| 수정 | `capital36`으로 일괄 보정. `0092_repayperiod_truth_backfill.sql` 드래프트 존재 |
| 참조 | `REHABILITATION_LAW_RULES.md` §2, `audit/colaw_repayperiod_truth.tsv` |

### BUG-004: 채권자 번호 재정렬 미구현

| 항목 | 내용 |
|------|------|
| 심각도 | **P1** |
| 위치 | UI 채권자 관리 (채권자 탭) |
| 증상 | 우선변제 채권을 채권번호 1번에 삽입해도 기존 채권의 `bond_number`가 자동으로 밀리지 않음 |
| 기대 동작 | 분류 순서(재단→우선→별제→일반→미확정)에 따라 `bond_number` 자동 재정렬 |
| 수정 방향 | 채권자 저장 시 전체 `bond_number` 재계산 로직 추가. 또는 `sort_order` 별도 컬럼 활용 |

### BUG-005: capitalOnly 모드 안분 분모 오류 가능성

| 항목 | 내용 |
|------|------|
| 심각도 | **P1** |
| 위치 | `schedule-generator.ts` line 49 |
| 코드 | `totalDebt = Σ(capital + (capitalOnly ? 0 : interest))` |
| 문제 | `capitalOnly=true`에서 안분 분모가 원금 합계만 사용되는 것은 맞으나, 이후 `ratio` 계산에서 `creditorDebt`도 원금만 사용하는지 확인 필요 |
| 법적 정답 | "원금의 액수를 기준으로 안분" (가이드 p.8). 현재 코드는 일견 올바르나, `repayType='sequential'` 분기에서 `capitalRepay = min(capital, total)` 시 total이 원금 초과 가능 → 이자도 변제하게 되는 모순 |
| 수정 | capitalOnly 모드에서 `capitalRepay = total`, `interestRepay = 0` 고정 확인 (line 80-82 이미 존재, OK) |

---

## P2 — 표시 결함

### BUG-006: gross_salary DB↔폼 불일치

| 항목 | 내용 |
|------|------|
| 심각도 | **P2** |
| 위치 | `rehabilitation_income_settings` ↔ 소득·생계비 폼 |
| 증상 | DB에 저장된 `gross_salary` 값과 프론트엔드 폼에 표시되는 값이 다름 |
| 재현 | v2/v3 더미 사건에서 income_settings 직접 UPDATE 후 페이지 새로고침 시 이전 값 표시 |

### BUG-007: 채권자 아코디언 빈 공간 렌더링

| 항목 | 내용 |
|------|------|
| 심각도 | **P2** |
| 위치 | 채권자 탭 → 상세 아코디언 펼침 |
| 증상 | D은행 등 특정 채권자 아코디언 펼치면 **거대한 빈 공간** 발생, 하단 채권자 접근 불가 |
| 우회 | accessibility tree(`read_page`) + `scrollIntoView` JavaScript로 확인 가능했음 |

---

## 연관 작업

| 작업 | 상태 | 비고 |
|------|------|------|
| `REHABILITATION_LAW_RULES.md` 작성 | ✅ 완료 | 법률 규칙 전체 문서화 |
| 김한경 creditor cleanup (13→10행) | ⏳ 대기 | soft delete 3행 필요 |
| 이옥주/임경애/조두성 zeroed capital | ⏳ 대기 | COLAW 재수집 필요 |
| 검증더미 v3 정리 | ⏳ 대기 | 검증 완료 후 soft delete |
| PR#3 creditors 보정 | ⏳ 대기 | BUG-001 수정 포함 |

---

## 운영자 액션 요청

1. **BUG-001 (P0)**: `schedule-generator.ts`에 우선변제 100% 보장 로직 구현. `REHABILITATION_LAW_RULES.md` §4 참조
2. **BUG-002 (P0)**: 청산가치 데이터 파이프라인 수정. 재산목록 합계 → 변제계획 자동 연동
3. **BUG-003 (P1)**: `0092_repayperiod_truth_backfill.sql` 완성 및 적용
4. **BUG-004 (P1)**: 채권자 `bond_number` 자동 재정렬 구현
5. 레거시 91건 `capital60` → `capital36` 보정 SQL 확정

---

*이 리포트는 `docs/REHABILITATION_LAW_RULES.md`와 함께 읽어야 합니다.*
