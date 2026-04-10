# P1 포팅 디렉티브 — 2026-04-07

**전제**: P0 (라이프니츠 · 계단식 배분 · 별제권 분류) 완료·커밋·DB 적용·회귀 테스트 PASS. 이 문서는 **김한경 케이스 외 잔여 VS↔colaw 불일치**를 닫기 위한 다음 계층 작업을 정의한다.

**원칙**:
- 기능 이식이지 데이터 이식이 아님. 이미 마이그레이션된 케이스와 **VS에서 새로 입력된 케이스 모두 원 단위 일치**해야 한다.
- 각 항목은 (a) 코드 변경 (b) 마이그레이션 or 데이터 보정 (c) 검증 케이스를 동시에 포함한다.
- P1 완료 기준 = `creditor-mismatch` 70건 중 **원인 분류가 끝나고**, 코드 수정으로 닫을 수 있는 건은 닫힘, 원본 데이터 문제는 목록화.

---

## P1-1 생계비 자동 조정 (3인 가구 기준중위소득 60%)

**배경**: colaw는 `living_cost`가 비어 있거나 기준 미달이면 `가구원수별 기준중위소득 × 60%`로 자동 채운다. VS는 입력값을 그대로 사용 → 기준 미달 값도 통과.

### 코드
- 새 파일 `src/lib/rehabilitation/living-cost.ts`
  ```ts
  // 2025년 기준 (보건복지부 고시) — 매년 업데이트 필요
  export const MEDIAN_INCOME_2025: Record<number, number> = {
    1: 2_392_013,
    2: 3_932_658,
    3: 5_025_353,
    4: 6_097_773,
    5: 7_108_192,
    6: 8_064_805,
    7: 8_989_426,
  };

  export function minimumLivingCost(householdSize: number, year = 2025): number {
    const table = MEDIAN_INCOME_2025; // year 분기는 추후
    const base = table[householdSize] ?? table[7];
    return Math.floor(base * 0.6);
  }

  export function adjustLivingCost(input: number, householdSize: number): {
    adjusted: number;
    wasClamped: boolean;
    floor: number;
  } {
    const floor = minimumLivingCost(householdSize);
    if (input >= floor) return { adjusted: input, wasClamped: false, floor };
    return { adjusted: floor, wasClamped: true, floor };
  }
  ```
- `document-generator.ts`에서 `livingExpense` 계산 직전 `adjustLivingCost` 호출. `wasClamped=true`이면 리포트 상단에 "생계비는 기준중위소득 60%로 자동 조정됨" 주석.

### 검증
```ts
expect(minimumLivingCost(3)).toBe(3_015_211); // 5,025,353 × 0.6
expect(adjustLivingCost(2_500_000, 3).wasClamped).toBe(true);
expect(adjustLivingCost(2_500_000, 3).adjusted).toBe(3_015_211);
```

### 데이터
- `rehabilitation_income_settings`에 `household_size int not null default 1` 존재 여부 확인. 없으면 migration 0089 추가.
- 기존 입력값 < 기준 60%인 케이스 집계:
  ```sql
  select case_id, household_size, living_cost from rehabilitation_income_settings
  where living_cost < (/* 각 household_size별 기준 */);
  ```

---

## P1-2 변제기간 자동 결정 (36 / 48 / 60)

**배경**: 개인회생법 개정 이후 기본 36개월이지만 케이스 조건(청산가치 미달, 특별 사정)에 따라 48/60개월 연장 가능. colaw는 이를 **자동 판정 + 사용자 override** 구조로 돌린다. VS는 수동 입력만.

### 판정 로직 (초안 — colaw 측 알고리즘 추가 확인 필요)
```
기본 = 36
if (월가용 × 라이프니츠(36) < 청산가치) then 기본 = 48
if (월가용 × 라이프니츠(48) < 청산가치) then 기본 = 60
if 사용자 override 있으면 override
```

### 코드
- `src/lib/rehabilitation/plan-duration.ts` — `determinePlanDuration({ monthlyAvailable, liquidationValue, override })`
- `document-generator.ts`에서 입력 `planDurationMonths`가 없을 때 자동 결정 호출
- **블로커**: 48/60개월 라이프니츠 계수가 아직 없음 → 해당 기간 colaw 케이스 1건씩 확보 후 수치 입력 필요 (조사관 작업). P1-2 코드는 계수 null이면 "자동 결정 불가, 수동 입력 요망" 에러로 throw.

### 검증
- 김한경: 월가용 561,457 · 청산가치 미상 → 자동 결정 = 36 (colaw와 일치)
- 테스트는 모의 청산가치로 36/48/60 경계값 커버

---

## P1-3 변제율 표기 (%)

**배경**: B_29 page 13에 "변제율 39%" 명시. VS는 `totalRepay / totalClaim` 단순 비율이 아니라 **(확정 + 미확정 변제총액) / (확정 + 미확정 채권총액)** 으로 산출해야 colaw와 일치.

### 코드
- `src/lib/rehabilitation/repayment-rate.ts`
  ```ts
  export function repaymentRate(schedules: CreditorRepaySchedule[], creditors: RehabCreditor[]): number {
    const classifiedTotals = creditors.map(c => classifyCreditor({...}));
    const denominator = classifiedTotals.reduce((s, x) => s + x.confirmedAmount + x.unconfirmedAmount, 0);
    const numerator = schedules.reduce((s, x) => s + x.confirmedAmount + x.unconfirmedAmount, 0);
    return denominator > 0 ? numerator / denominator : 0;
  }
  ```
- `document-generator.ts` "나. 총변제예정액" 표 아래 "변제율 xx.x%" 행 추가.

### 검증
- 김한경: 확정+미확정 분모 = 총채권 67,394,484 − 담보충당 10,680,000 = 56,714,484. 분자 ≈ 20,212,548 (또는 그 중 무담보 합). 변제율 ≈ 35~39% 범위. 실측 B_29 페이지 13 숫자와 원 단위 비교 테스트.

---

## P1-4 B_19 "10항 이하" 자동문구 엔진

**배경**: colaw B_19는 변제계획안 10항 이하를 조건부 템플릿으로 자동 생성한다. VS는 해당 섹션을 수동 입력.

### 코드
- `src/lib/rehabilitation/plan-text-engine.ts`
- 템플릿 정의:
  ```ts
  export const PLAN_CLAUSES = {
    BASE: '변제계획안에 따른 변제를 성실히 이행합니다.',
    SECURED_SHORTENED: '별제권부 채권이 존재하므로 변제기간을 단축하여 …',
    INCOME_DECLARATION: '직업 및 수입상황 변동 시 1개월 이내 신고 의무를 이행합니다.',
    // ...
  };
  export function composePlanText(ctx: {
    hasSecuredCreditor: boolean;
    planDurationMonths: number;
    householdSize: number;
    // ...
  }): string[] {
    const out = [PLAN_CLAUSES.BASE];
    if (ctx.hasSecuredCreditor) out.push(PLAN_CLAUSES.SECURED_SHORTENED);
    out.push(PLAN_CLAUSES.INCOME_DECLARATION);
    return out;
  }
  ```
- `document-generator.ts`의 "10. 기타사항" 섹션을 `composePlanText()` 호출 결과로 교체.
- 수동 오버라이드 경로: `rehabilitation_plan_overrides` 테이블(없으면 신설)로 조항별 덮어쓰기 가능.

### 블로커
- 전체 조항 사전이 아직 미수집. 김한경 B_19는 첫 캡처만 확보. P1-4 1차는 **5~6개 대표 조항만** 이식, 나머지는 colaw B_19 추가 스크래핑 후 이식.

### 검증
- 김한경(별제권부 존재) → SECURED_SHORTENED 포함
- 가상 일반 케이스 → BASE + INCOME_DECLARATION만

---

## P1-5 마이그레이션 스크립트 — 담보평가액 추출 (P0-3 (e) 잔재)

**배경**: `migrate-colaw-to-vs.ts`는 채권자 `capital`/`interest`만 긁고 담보평가를 안 잡는다. 결과: 0088 마이그레이션에서 66건 `is_secured=true` → `false`로 임시 리셋된 데이터 미복원.

### 작업
- colaw `popupAttachedDocumentsList` 모달을 정상 플로우(부모 팝업에서 저장 → 버튼 클릭 → showModlDialog)로 열어 DOM 캡처. 필드명 확정 (후보: `appraisalamount`, `collateralvalue`, `damboamount` 등).
- `migrate-colaw-to-vs.ts` page.evaluate 블록 확장:
  ```ts
  // 기존
  capital: g('capital'),
  // 추가
  secured_collateral_value: gNum('appraisalamount'), // 필드명 확정 후
  is_secured: !!g('appraisalamount') && Number(g('appraisalamount').replace(/,/g,'')) > 0,
  ```
- 재실행 대상: 기존 마이그레이션 66건 + 신규. 기존 데이터는 UPSERT로 담보평가만 패치.

### 검증
- 재마이그레이션 후 김한경 제이비우리캐피탈 `is_secured=true`, `secured_collateral_value=10680000`이 **수동 세팅 없이도 재현**되어야 함.
- 전체 66건 중 실제 `appraisalamount > 0`인 건수 = 원래 별제권부 채권 수와 일치해야 함.

---

## P1-6 김한경 중복 사건 정리 + creditor-mismatch 70건 재집계

### (a) 중복 사건
- a8088ec2 (cs=5640948) / b6823d01 — 둘 중 하나는 고아 데이터. 원본 colaw `casebasicsseq`로 식별 후 미사용 건 soft delete (`lifecycle_status = 'soft_deleted'`, UX #8 규칙).
- `rehabilitation_creditors`도 cascade 처리 확인.

### (b) creditor-mismatch 70건
- P0-3 적용 후 재집계:
  ```
  npm run verify:rehabilitation -- --case-diff-only
  ```
- 70건 → 각 건의 차액을 (확정/미확정 분리 문제 / 계단식 배분 문제 / 생계비 문제 / 기타)로 분류.
- 분류 결과 테이블을 `docs/reports/mismatch-triage-2026-04-08.md`에 저장. P2 범위 결정의 입력.

---

## 실행 순서 권장

1. **P1-1 생계비** — 독립·빠름·테스트 쉬움 → 먼저
2. **P1-3 변제율** — 표기만이라 P0 로직 기반으로 즉시 가능
3. **P1-6 (b)** — P0+P1-1+P1-3 적용 상태에서 mismatch 재집계 → 실제 남은 문제 파악
4. **P1-2 변제기간 자동결정** — 48/60 계수 확보 후 (조사관 의존)
5. **P1-4 B_19 엔진** — 1차 5~6 조항만
6. **P1-5 마이그레이션 스크립트** — colaw 모달 캡처 선행

---

## 검증 체크포인트 (P1 종료 기준)

- [ ] P1-1/P1-3 회귀 테스트 PASS
- [ ] 김한경 케이스의 **라이프니츠 · 계단식 · 변제율 · 생계비**가 B_29와 원 단위 일치
- [ ] mismatch 70건 중 코드 고정 가능 건 100% 닫힘
- [ ] 48/60개월 라이프니츠 계수 최소 1개 이상 확보 (또는 blocker 명시)
- [ ] B_19 1차 5~6 조항 렌더링 확인

---

## 잔여 블로커 (조사관 선행 필요)

1. **48/60개월 라이프니츠 계수** — 해당 기간 colaw 케이스 1건씩
2. **colaw `popupAttachedDocumentsList` 필드명** — 정상 UI 플로우에서 모달 캡처
3. **B_19 전체 조항 사전** — colaw 여러 케이스 B_19 스크래핑해서 조건부 문장 목록 도출
4. **2025 기준중위소득 공식 수치** — 보건복지부 고시 크로스체크 (디렉티브 안의 숫자는 1차 추정치)
