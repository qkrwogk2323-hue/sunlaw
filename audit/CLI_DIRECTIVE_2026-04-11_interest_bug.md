# CLI 작업 지시서 — 이자변제 버그 + living_cost_rate 수정

검증관(Cowork) 발행. 2026-04-11.
우선순위: 🔴 P0 (금액 계산 오류)

---

## 버그 1: schedule-generator.ts — capital36에서 이자 변제 계산 (CRITICAL)

### 현상
`repayment-calculator.ts`는 `capital36` → `targetAmount = totalCapital` (이자 제외)로 올바르게 처리.
그런데 `schedule-generator.ts`는 **plan type을 전혀 모른 채** 항상 `capital + interest`를 분모로 사용.

### 문제 코드

**schedule-generator.ts 47-49줄:**
```typescript
// ❌ 항상 이자 포함
const totalDebt = creditors.reduce(
  (s, c) => s + (c.capital || 0) + (c.interest || 0), 0
);
```

**78-88줄:**
```typescript
// ❌ sequential: 원금 넘는 부분을 이자 변제로 처리
capitalRepay = Math.min(creditor.capital || 0, total);
interestRepay = Math.max(0, total - (creditor.capital || 0));

// ❌ combined: 이자 비율대로 항상 배분
interestRepay = total - capitalRepay;
```

**185-186줄 (tiered):**
```typescript
// ❌ 같은 패턴
const capitalRepay = Math.min(x.creditor.capital || 0, entry.total);
const interestRepay = Math.max(0, entry.total - (x.creditor.capital || 0));
```

### 영향
- capital36 (기본값)인 92건 전부에서 채권자별 배분 비율이 틀림
- UI에 이자 변제액 > 0 표시 → 법적으로 면책 대상인 이자를 변제하는 것처럼 보임
- 법원 제출 서류에 잘못된 수치 노출 위험

### 수정 방향

**1) `generateRepaySchedule` 시그니처에 `capitalOnly` 추가:**
```typescript
export function generateRepaySchedule(
  creditors: RehabCreditor[],
  monthlyRepay: number,
  repayMonths: number,
  disposeAmount: number,
  repayType: RepayType,
  capitalOnly: boolean = false,  // ← 추가
): CreditorRepaySchedule[]
```

**2) 분모 계산:**
```typescript
const totalDebt = creditors.reduce(
  (s, c) => s + (c.capital || 0) + (capitalOnly ? 0 : (c.interest || 0)),
  0,
);
// creditorDebt도 동일
const creditorDebt = (creditor.capital || 0) + (capitalOnly ? 0 : (creditor.interest || 0));
```

**3) interest 배분:**
```typescript
if (capitalOnly) {
  capitalRepay = total;
  interestRepay = 0;
} else if (repayType === 'sequential') {
  capitalRepay = Math.min(creditor.capital || 0, total);
  interestRepay = Math.max(0, total - (creditor.capital || 0));
} else {
  // combined
  const capRatio = creditorDebt > 0 ? (creditor.capital || 0) / creditorDebt : 0;
  capitalRepay = Math.round(total * capRatio);
  interestRepay = total - capitalRepay;
}
```

**4) `generateTieredSchedule`도 동일하게 `capitalOnly` 전달 + 적용**

**5) `computeTieredSegments` 211-212줄도 수정**

**6) 호출부 (rehab-plan-tab.tsx):**
```typescript
const isCapitalOnly = ['capital36', 'capital60', 'capital100_3y', 'capital100_5y'].includes(repayOption);
const schedule = generateRepaySchedule(creditors, monthlyRepay, repayMonths, disposeAmount, repayType, isCapitalOnly);
```

**7) UI 조건부 표시:**
- `isCapitalOnly`이면 "이자 변제" 컬럼 숨김 또는 "면책" 표시
- D5112 간이양식 테이블도 동일 적용

---

## 버그 2: rehabilitation-actions.ts — living_cost_rate 서버 디폴트 불일치

### 현상
- UI 디폴트: `100` (= 기준중위소득 60% 그대로 적용)
- 서버 디폴트: `60` (= 기준중위소득의 36%로 재적용)

### 수정
**rehabilitation-actions.ts 449줄:**
```typescript
// Before:
living_cost_rate: form.living_cost_rate ?? 60,

// After:
living_cost_rate: form.living_cost_rate ?? 100,
```

---

## 체크리스트

- [ ] schedule-generator.ts `capitalOnly` 파라미터 추가
- [ ] 분모 계산에서 capitalOnly일 때 이자 제외
- [ ] interestRepay = 0 고정 (capitalOnly)
- [ ] generateTieredSchedule 동일 수정
- [ ] computeTieredSegments 동일 수정
- [ ] rehab-plan-tab.tsx 호출부에 isCapitalOnly 전달
- [ ] 정식양식 UI: 이자 컬럼 조건부 표시
- [ ] D5112 간이양식 UI: 동일 적용
- [ ] living_cost_rate ?? 60 → ?? 100
- [ ] typecheck 통과
- [ ] 김한경 케이스 39% 변제율 회귀 테스트 유지 확인
