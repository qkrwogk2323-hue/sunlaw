# ⚠️ 아카이브 — 현재 챕터 아님

> 이 문서는 2026-04-12 검수 기록으로, 현재 진행 중인 챕터가 아닙니다.
> 현재 상태는 `docs/CURRENT_CONTEXT.md`를 참조하세요.

---

# 개인회생 모듈 E2E 감사 보고서

> 감사 일자: 2026-04-12
> 대상: `src/lib/rehabilitation/` + `src/app/(app)/cases/[caseId]/rehabilitation/`
> 기준: CLAUDE.md 법원서류 양식 규칙 + 계산 규칙

---

## 요약

| 분류 | 심각 | 중간 | 경미 |
|------|------|------|------|
| 문서 생성 (document-generator.ts) | 5 | 4 | 2 |
| 계산 로직 | 2 | 3 | 1 |
| UI/UX 규칙 위반 | 1 | 3 | 2 |
| **합계** | **8** | **10** | **5** |

---

## A. 문서 생성 (document-generator.ts) — 법원서식 규칙 위반

### 🔴 A-1. 변제계획안 제목 중복 (심각)

**위치**: L1611, L1637
**현상**: `<h1>변 제 계 획(안)</h1>`이 표지와 본문에 2번 출력됨.
법원 서식에서 표지는 "변제계획안 제출서"이고, 본문이 "변제계획(안)"이어야 함.

**CLAUDE.md 기준**: 변제계획안 본문은 10개 항목으로 구성 — 표지(제출서)와 본문(계획안)은 별개 문서.

**수정 방향**: L1611을 `<h1>변 제 계 획 안 제 출 서</h1>`로 변경.

---

### 🔴 A-2. 3항(재단채권)·4항(우선채권) 미구현 (심각)

**위치**: L1676-1682
**현상**: 3항, 4항이 빈 `<p style="height: 40px;"></p>` 플레이스홀더.
"해당있음/해당없음" 동적 체크, 채권자명, 채권현재액, 변제기 등 필수 기재사항 전부 누락.

**CLAUDE.md 기준**:
- 3항: 회생위원 보수 및 비용, 기타 재단채권 (법 §583)
- 4항: 우선권 있는 채권 (국세/건강보험료 등)
- 각 항에 `해당있음/해당없음` 동적 판정 + 채권자명, 채권현재액, 변제방법 기재 필수

**수정 방향**: `creditors` 데이터에서 `has_priority_repay`, `priorityClass` 기반으로 3항/4항 동적 생성.

---

### 🔴 A-3. 5항(별제권부) 하드코딩 체크박스 (심각)

**위치**: L1685
**현상**: `[ 해당있음 ■ / 해당없음 □ ]` 고정 — 별제권 채권자가 0명이어도 항상 "해당있음".

**CLAUDE.md 기준**: 별제권 유무를 `is_secured` 채권자 존재 여부에 따라 동적 판정해야 함.

**수정 방향**: `creditors.filter(c => c.is_secured).length > 0` 조건으로 동적 전환.

---

### 🔴 A-4. 변제계획안 본문 10개 항목 중 6~10항 불완전 (심각)

**위치**: L1687-1920
**현상**:
- 6항(일반채권 변제): 가/나 구분 없이 단순 테이블만 출력. `[원금]` 기재, 변제방법(기간/횟수/변제월), ①②항 적립금 변제방법 등 법원서식 필수 기재사항 대부분 누락.
- 7항(미확정채권): 완전 누락 — `is_unsettled` 채권 존재 시 유보금 배분 조항 필요
- 8항(임치 및 지급): 완전 누락 — 해당 항 번호 `[ ]` 기재 필수
- 9항(면책 범위): 완전 누락 — 양식 문구 그대로 기재 필수
- 10항(기타사항): 완전 누락

**CLAUDE.md 기준**: D5110/D5111 양식 10개 항목 전부 구현 필수.

**수정 방향**: `planSections` 데이터(이미 DB에 저장 구조 있음)를 활용하여 7~10항 추가.

---

### 🔴 A-5. 안분 공식에서 월변제예정액 Math.round 사용 (심각)

**위치**: L1811, L1887-1889
**현상**: 채권자별 변제예정액 표(별표1)에서 `Math.round(monthlyTotal * ratio)` 사용.

**CLAUDE.md 기준**: `(E) 월변제예정액 (채권자별) → Math.ceil (올림)`.
올림을 사용해야 합계가 월가용소득보다 약간 커지는 것이 정상.

**수정 방향**: `Math.round` → `Math.ceil` + 마지막 채권자 잔여 보정.

---

### 🟡 A-6. 변제율 계산 소수점 처리 불일치 (중간)

**위치**: L1763-1764
**현상**: `Math.round((totalRepayAmount / totalClaimMinusSecured) * 1000) / 10` → 소수 1자리.
**CLAUDE.md 기준**: `변제율(%) = (총변제액 / 무담보원금) × 100`, `Math.round (반올림)` → 정수.

분모도 불일치: CLAUDE.md는 "무담보원금"이 분모인데, L1754는 `claim - collateral` (원금+이자 기준) 사용.

**수정 방향**:
1. 분모를 `unsecuredCapital` (원금만)으로 통일 — `repayment-calculator.ts`의 `getDebtSummary().unsecuredCapital`과 일치시킬 것
2. L1798-1800의 채권자별 변제율 표는 이미 `unsecuredDenom` (원금 기준)을 사용하고 있어 L1753과 불일치

---

### 🟡 A-7. 현재가치 계산에 Math.round 사용 (중간)

**위치**: L1726
**현상**: `Math.round(availableIncome * coef)` — 반올림 사용.

**CLAUDE.md 기준**: `(L) 현재가치 (라이프니쯔) → Math.floor (버림)`.
`leibniz.ts`의 `presentValue()`는 올바르게 `Math.floor`를 사용하나, document-generator 내부 인라인 계산은 `Math.round`.

**수정 방향**: `Math.round` → `Math.floor`. 또는 `presentValue()` 함수를 import하여 사용.

---

### 🟡 A-8. 라이프니쯔 계수 36/48/60만 지원 (중간)

**위치**: L1724
**현상**: `{ 36: 33.7719, 48: 43.9555, 60: 53.6433 }` 하드코딩.
`leibniz.ts`에도 동일하게 3개만 등록.

**CLAUDE.md 기준**: 변제기간은 기본 36, 최장 60이므로 48 포함 3개면 기본은 충족.
단, 변제기간 자동연장 시 48→60 사이 값이 필요할 수 있고, 정확한 월별 계수는 제공 불가.

**수정 방향**: 현재 36/48/60만 지원하는 것은 허용 범위이나, 변제기간이 3개 외일 때 `— (계수 미확정)` 표시는 적절. 리스크 낮음.

---

### 🟡 A-9. 수입및지출목록(D5103) 누락 사항 (중간)

**위치**: L1262-1375 (`generateIncomeStatement`)
**현상**:
- 월 평균 수입 = `monthlySalary + extraIncome` — 연간환산/12 올림(Math.ceil) 미적용
- 기간 환산 승수(월=12, 분기=4 등) 미지원 — 모든 항목을 "월" 단위로 고정
- 추가생계비 비율 계산 `((총지출 - 기본생계비) / 기본생계비) × 100` 미표시
- 수입 항목에 압류/가압류 "무" 하드코딩

**CLAUDE.md 기준**: D5103 수입/지출 기재 규칙에 연간환산 합계/12 올림, 기간환산 승수, 추가생계비 비율 필수.

---

### ⚪ A-10. 채권자목록 요약표 구조 불일치 (경미)

**위치**: `generateCreditorSummary()` (L2050-2130)
**현상**: CLAUDE.md는 "상단 2분류(담보부/무담보) × 하단 3분류(별제권부/일반확정/미확정)" 요구.
현 구현은 "우선변제권/담보부/무담보" 3분류로, "미확정" 별도 행 없음.

---

### ⚪ A-11. 법원서류 여백 CSS 미세 차이 (경미)

**위치**: L130-133
**현상**: `@page { margin: 45mm 20mm 30mm 20mm; }` — CLAUDE.md와 일치 ✅
`font-size: 12pt`, `line-height: 200%` — 일치 ✅
`table font-size: 10pt` — 일치 ✅
이 부분은 문제 없음.

---

## B. 계산 로직 — CLAUDE.md 공식 준수 검증

### 🔴 B-1. repayment-calculator.ts 회생위원 보수 공식 오류 (심각)

**위치**: `calculateMonthlyAvailable()` L77-92
**현상**: 회생위원 보수를 `available * (1 - trusteeCommRate / 100)` 즉 가용소득에 비례로 차감.

**CLAUDE.md 기준**:
```
④ 회생위원 보수:
    채무총액 ≤ 2억 AND 급여소득자 → 법원사무관 → 0원
    그 외 → 외부 위원 → ③의 1% (반올림)
```
③ = 월 가용소득 = ① - ②. 즉, 보수 = `Math.round(③ * 0.01)`.
현 구현은 `trusteeCommRate`를 % 단위로 받아 처리하므로 rate=1이면 일치하나, 2억/급여소득자 자동 0원 판정 로직이 없음.

**수정 방향**: 채무총액 + 소득유형 기반 자동 판정 추가. `monthly-available.ts`의 `computeMonthlyAvailable()`은 `trusteeCommissionRate`를 월소득 기준으로 적용 중인데, CLAUDE.md는 가용소득(③) 기준 1%이므로 기준이 다름.

**참고**: `monthly-available.ts` L52-54는 `monthlyIncome * commissionRate / 100` — **월소득 기준**으로 차감. CLAUDE.md는 **가용소득(③) 기준** 1%이므로 불일치.

---

### 🔴 B-2. document-generator 내 안분 공식의 분모 불일치 (심각)

**위치**: L1589, L1595
**현상**: `totalDebt = creditors.reduce(sum + capital)` — **원금만** 합산.
L1596: `ratio = principalAmount / totalDebt` — 원금 기준 안분.

이것 자체는 CLAUDE.md의 "안분 기준: 원금 원칙"에 부합하나, 문제는:
- L1880-1881: 별표(1) 계산에서는 `credDebt = cap + interest` (원금+이자)를 분모로 사용
- 같은 문서 내에서 6항 채권자 테이블과 별표(1)의 분모가 다름

**수정 방향**: 안분 기준을 문서 전체에서 통일. `capitalOnly` 플래그 또는 `periodSetting` 기반으로 결정.

---

### 🟡 B-3. schedule-generator.ts 마지막 채권자 보정이 음수 가능 (중간)

**위치**: `generateProRataSchedule()` L183-186
**현상**: 마지막 채권자 = `monthlyRepay - monthlyAllocated`. 올림 누적이 크면 음수 가능.

**CLAUDE.md 기준**: "마지막 채권자가 잔여분을 흡수하여 총액과 정확히 일치" — 음수 방지 필요.

**수정 방향**: `Math.max(0, ...)` 가드 추가.

---

### 🟡 B-4. property-valuation.ts 임차보증금 우선변제 범위 미처리 (중간)

**위치**: `calculateCategorySubtotal()` L40-82
**현상**: CLAUDE.md에 "임차보증금: 주택임대차보호법 §8 우선변제 범위 내 금액은 압류 불가 → 청산가치 제외" 규칙이 있으나, 현 구현은 임차보증금(`lease`)을 전액 청산가치에 포함.

**수정 방향**: `lease` 카테고리에 우선변제 범위 공제 로직 추가.

---

### 🟡 B-5. period-setting.ts presentValue 에러 미처리 (중간)

**위치**: `decidePeriodSetting()` L137
**현상**: `presentValue(input.monthlyAvailable, months)` 호출 시 `months`가 36/48/60이 아니면 `throw Error`.
`forcedMonths`가 없고 `baseMonths=36`이면 문제 없으나, 내부 연장 로직에서만 48/60을 시도하므로 안전.

**리스크**: 낮음. 현재 코드 흐름상 36→48→60만 시도하므로 에러 발생 경로 없음.

---

### ⚪ B-6. median-income.ts 폴백 연도 2025 (경미)

**위치**: L46
**현상**: 미등록 연도 → 2025 폴백. CLAUDE.md와 일치 ✅.

---

## C. UI/UX — CLAUDE.md 코드 규칙 위반

### 🔴 C-1. 모든 탭이 ClientActionForm + SubmitButton 미사용 (심각)

**현상**: 7개 탭 전부 `onClick={handleSave}` 직접 호출 방식.
CLAUDE.md 명시:
```
❌ 금지: <form action={serverAction}><button type="submit">저장</button></form>
✅ 필수: <ClientActionForm action={serverAction}><SubmitButton>저장</SubmitButton></ClientActionForm>
```

**영향**: 토스트 자동 연결, 에러 핸들링 일관성, 접근성 등이 수동 구현에 의존.
현재 `useToast`로 수동 호출하고 있어 기능적으로는 동작하나, 규칙 위반.

**수정 방향**: 개인회생 모듈은 클라이언트 상태 중심 (로컬 state → 일괄 저장) 구조라 `ClientActionForm` 패턴과 맞지 않는 면이 있음. 이행 원칙(0-8)에 따라 "수정 범위 내에서 규칙 준수"로 판단할 수 있으나, 신규 저장 기능 추가 시는 반드시 적용 필요.

---

### 🟡 C-2. 채권자 삭제에 undo 토스트 미구현 (중간)

**위치**: `rehab-creditors-tab.tsx` — `DangerActionButton` import는 있으나 삭제 시 `undo()` 토스트가 보이지 않음.

**CLAUDE.md 기준**: "삭제 후 반드시 `undo()` 토스트 + '보관함에서 복구 가능' 안내".

**수정 방향**: 삭제 action 후 `undo('삭제됨', { message: '8초 내 취소 가능', onUndo: handleUndo })` 호출 추가.

---

### 🟡 C-3. 재산 항목 삭제에 soft delete 미확인 (중간)

**위치**: `rehab-property-tab.tsx` — `softDeleteRehabProperty` import 존재 → soft delete 사용 확인 ✅.
단, undo 토스트 유무 미확인.

---

### 🟡 C-4. 50개 이상 채권자 시 서버 페이지네이션 없음 (중간)

**현상**: 채권자 목록이 전부 클라이언트에 로드됨. 50개 이상 시 서버 페이지네이션 필수.

**CLAUDE.md 기준**: "3-7: 50개 이상 → 서버 페이지네이션 필수".

**수정 방향**: 현실적으로 개인회생 채권자 50개 초과는 드물지만, 규칙 준수를 위해 threshold 체크 + lazy load 추가 권장.

---

### ⚪ C-5. 필수 필드 빨간 * 표시 미확인 (경미)

일부 탭에서 `required` 필드에 `<span className="text-red-500">*</span>` 유무 확인 필요.
전체 탭 소스를 정밀 스캔하지 못했으나, CLAUDE.md 폼 필드 규칙 준수 여부 미확인.

---

### ⚪ C-6. 보증채무 미확정 자동체크 구현 여부 미확인 (경미)

**CLAUDE.md 기준**: `bond_type`을 '보증채무'로 변경 시 `is_unsettled` 자동 true 설정.
`rehab-creditors-tab.tsx`에서 해당 로직 존재 여부 미확인 — 별도 정밀 검사 필요.

---

## D. 계산 로직 — 정합 항목 (문제 없음)

| 항목 | 파일 | 판정 |
|------|------|------|
| leibniz 현가계수 36/48/60 | leibniz.ts | ✅ 정확 (Math.floor) |
| 기준중위소득 2022-2026 | median-income.ts | ✅ 고시 데이터 일치 |
| 폴백 연도 2025 | median-income.ts L46 | ✅ CLAUDE.md 일치 |
| 8인 이상 증분 계산 | median-income.ts L49-50 | ✅ 정확 |
| 별제권 환가비율 기본값 | secured-allocation.ts L27-36 | ✅ 부동산70/자동차50/임차보증금100/예금100/보험100 |
| 별제권 순위 정렬 | secured-allocation.ts L61 | ✅ lienPriority 오름차순, null→999 |
| 채권자 분류 3경로 | creditor-classification.ts | ✅ 상호배타 (isOtherUnconfirmed 우선) |
| 재산 14카테고리 | property-valuation.ts | ✅ 15개(exempt 2종 포함) |
| 예금/보험 250만 공제 | property-valuation.ts L47-59 | ✅ 보장성만 공제 |
| 퇴직금 1/2 반영 | property-valuation.ts L63-65 | ✅ Math.round(sum/2) |
| 면제재산 0원 | property-valuation.ts L69-70 | ✅ |
| 월별 보정 스케줄 | rounding.ts | ✅ 김한경 검증 통과 |
| 6규칙 엔진 | period-setting.ts | ✅ 설정1~6 모두 구현 |
| 청산가치 보장 post-step | period-setting.ts L137-161 | ✅ 48→60 자동연장 |
| capitalOnly 플래그 전달 | schedule-generator.ts L35,167 | ✅ |
| 마지막 채권자 잔여 보정 | schedule-generator.ts L183-186 | ✅ (음수 가능성 외) |
| 전자소송 CSV BOM | ecourt-csv.ts L69 | ✅ UTF-8 BOM |
| CSV RFC 4180 준수 | ecourt-csv.ts L26-29 | ✅ |
| D5110 vs D5111 판정 | repayment-calculator.ts L290-296 | ✅ presentValue ≤ liquidationValue → D5111 |
| 채무한도 15억/10억 | repayment-calculator.ts L12-14 | ✅ |

---

## E. 수정 우선순위 (권장)

### Phase 1 — 법원 불인가 리스크 (즉시)
1. **A-5**: 안분 월변제예정액 `Math.round` → `Math.ceil`
2. **A-7**: 현재가치 `Math.round` → `Math.floor`
3. **A-2**: 3항/4항 재단채권·우선채권 동적 구현
4. **A-3**: 5항 별제권 동적 체크박스
5. **B-1**: 회생위원 보수 기준 (월소득→가용소득 1%)

### Phase 2 — 문서 완성도 (1주 내)
6. **A-4**: 7~10항 구현
7. **A-1**: 표지 제목 수정
8. **A-6**: 변제율 분모 통일
9. **A-9**: D5103 연간환산 올림 + 기간승수
10. **B-2**: 안분 분모 통일 (원금 vs 원금+이자)

### Phase 3 — UX 정합 (2주 내)
11. **C-2**: 채권자 삭제 undo 토스트
12. **C-1**: ClientActionForm 전환 검토
13. **B-3**: 마지막 채권자 음수 방지
14. **B-4**: 임차보증금 우선변제 범위 공제

---

*이 보고서는 코드 정적 분석 기반입니다. 실제 배포 사이트(veinspiral.com)에서의 브라우저 E2E 동작 검증은 별도 수행이 필요합니다.*