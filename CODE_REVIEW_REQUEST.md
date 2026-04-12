# 코드 리뷰 요청서 — Cowork 세션 변경분

> **작성일**: 2026-04-12
> **작성자**: Cowork 세션 (Claude Opus, 비CLI)
> **목적**: Cowork에서 직접 Edit 도구로 수정한 코드를 CLI가 정밀 검증해 주세요.
> **중요**: CLAUDE.md 규칙 준수 여부를 **모든 항목**에서 확인해야 합니다.

---

## 변경 파일 목록 (7개)

```
src/lib/rehabilitation/document-generator.ts   (+188 -36)
src/lib/rehabilitation/monthly-available.ts    (+14 -6)
src/lib/rehabilitation/repayment-calculator.ts (+9 -4)
src/lib/rehabilitation/schedule-generator.ts   (+6 -6)
src/lib/actions/case-actions.ts                (+19)
src/lib/queries/notifications.ts               (+1)
src/components/dashboard-hub-client.tsx         (+8 -2)
```

`git diff --stat`로 확인 가능. 아직 커밋되지 않았습니다.

---

## 1. document-generator.ts — 올림/버림 규칙 수정

### 1-1. 현재가치(L) Math.round → Math.floor

**위치**: `generateRepaymentPlan()` 내부, "나. 총변제예정액 및 현재가치" 블록
**변경 전**: `Math.round(availableIncome * coef)`
**변경 후**: `Math.floor(availableIncome * coef)`

**검증 포인트**:
- CLAUDE.md 올림/버림 규칙: `(L) 현재가치 (라이프니쯔) → Math.floor (버림)` — 맞는지?
- `leibniz.ts`의 `calculatePresentValue()`에서도 `Math.floor` 쓰고 있는지 정합성 확인
- 별도 파일(`leibniz.ts`)과 document-generator 내부 인라인 계산이 **같은 결과**를 내는지

### 1-2. 채권자별 월변제예정액(E) Math.round → Math.ceil

**위치 3곳**:
1. 섹션 2 채권자별 변제예정액 테이블 (`mPay = Math.ceil(availableIncome * ratio)`)
2. 별표(1) 월별 스케줄 테이블 (`Math.ceil(monthlyTotal * rt)` + `Math.ceil(monthlyTotal * ratio)`)
3. 합계행의 각 채권자 배분도 동일

**검증 포인트**:
- CLAUDE.md: `(E) 월변제예정액 (채권자별) → Math.ceil (올림)` — 3곳 모두 ceil인지?
- 올림 적용 후 합계가 월가용소득을 초과하는 것이 **정상**이라고 CLAUDE.md에 명시되어 있는데, 코드 로직이 이를 허용하는지?
- **마지막 채권자 잔여 흡수**: `monthlyTotal - (앞 채권자 ceil 합)` → 음수 가능성 없는지?
- `schedule-generator.ts`의 `generateProRataSchedule()`에서도 같은 ceil 로직 쓰는지 정합성

### 1-3. 변제율 분모 수정 (원금+이자 → 무담보 원금)

**위치**: "변제율" 표시 블록 2곳 (섹션 요약 + 섹션 2 테이블)
**변경 전**: `(원금 + 이자) - 별제권담보가치` (claim 기반)
**변경 후**: `원금 - 별제권담보가치` (capital 기반, 이자 제외)

**검증 포인트**:
- CLAUDE.md: `변제율(%) = (총변제액 / 무담보원금) × 100` — "무담보원금"이 이자를 제외한 원금만인지?
- `repayment-rate.ts`의 `calculateRepayRate()`와 같은 분모를 쓰는지 크로스체크
- 변제율 반올림: `Math.round(... * 100)` → 정수% 반올림. CLAUDE.md는 `Math.round (반올림)` — OK?
- 변경 전에는 `* 1000 / 10`으로 소수점 1자리였는데 정수로 바꿈 — 법원서식 기준은?

---

## 2. document-generator.ts — 변제계획안 본문 10개 항목 구현

### 2-1. 섹션 2 "나. 재산" (D5110/D5111 분기)

**추가된 로직**:
```
pvForForm = Math.floor(availableIncome * leibnizCoef)
needsDisposal = pvForForm <= liqValueForForm  → D5111
```

**검증 포인트**:
- D5110/D5111 판별 공식이 `repayment-calculator.ts`의 `determineFormType()`과 **동일한지**
- `<=`인지 `<`인지 — CLAUDE.md: `현재가치(가용소득 총변제) ≤ 청산가치 → D5111` — 맞는지?
- 인라인으로 청산가치를 다시 계산하는데, 이미 위에서 계산한 `liquidationValueComputed`와 **같은 값인지**
  (중복 계산 → 변수 불일치 위험)

### 2-2. 섹션 3 "개인회생재단채권에 대한 변제"

**추가된 로직**:
- `trustee_comm_rate > 0` → 외부 위원 → "해당있음" + 보수 표시
- `trustee_comm_rate === 0` → 법원사무관 → "해당없음" + "별도 보수 없음" 표시
- `monthlyResult.trusteeCommission` 사용

**검증 포인트**:
- CLAUDE.md 섹션 3 규칙: "가. 회생위원의 보수 및 비용" + "나. 기타 개인회생재단채권" — 구조 맞는지?
- `monthlyResult.trusteeCommission` 이 실제로 존재하는 프로퍼티인지 (monthly-available.ts 반환값 확인)
- 외부 위원일 때 "인가 전·후 보수란 **모두** 기재" — 현재 코드는 월 보수만 표시. 인가 전/후 분리가 필요한지?

### 2-3. 섹션 4 "일반의 우선권 있는 개인회생채권에 대한 변제"

**추가된 로직**:
- `has_priority_repay && !is_secured` 필터
- 해당 채권자 테이블 (번호/채권자명/채권현재액/채권발생원인/변제방법)

**검증 포인트**:
- 우선채권 필터가 정확한지: `has_priority_repay=true`이면서 `is_secured=false`인 것만?
  별제권이면서 동시에 우선변제인 경우는 섹션 5에서 처리되는지?
- "변제개시일부터 변제기간 내 전액 변제" — 하드코딩된 문구가 법원서식과 일치하는지?
- CLAUDE.md: 채권발생원인에 "우선권 근거" 포함 필요 — 현재 `bond_cause`만 표시, 충분한지?

### 2-4. 섹션 5 "별제권부 채권 처리"

**추가된 로직**:
- `is_secured` 채권자 유무에 따라 해당있음/없음 동적 전환
- (기존 별제권 테이블은 그대로 유지)

**검증 포인트**:
- 별제권 없을 때 "해당없음"으로 바뀌면, 그 아래의 별제권 상세 테이블은 빈 상태로 렌더링되는지?
- 빈 테이블 헤더만 출력되면 보기 안 좋음 — 조건부로 테이블 자체를 숨겨야 하는지?

### 2-5. 섹션 6 "일반 개인회생채권에 대한 변제" 헤더 추가

**추가된 코드**:
```html
<h3>6. 일반 개인회생채권에 대한 변제</h3>
<p>가. 가용소득에 의한 변제</p>
<p>(1) 월 변제예정(유보)액 및 총 변제예정(유보)액: [원금] 기준 안분</p>
<p>(2) 변제방법: (가) 기간 N개월, 횟수 N회 / (나) 매월 같은 날</p>
```

**검증 포인트**:
- CLAUDE.md 섹션 6 규격과 비교 — "①항", "②항" 세부 항목이 빠져있는지?
- D5111일 때 "나. 재산의 처분에 의한 변제" 항목이 없음 — 추가 필요한지?

### 2-6. 섹션 7 "미확정 개인회생채권에 대한 조치"

**추가된 로직**:
- `is_unsettled || is_other_unconfirmed` 필터
- 법정 문구: "확정될 때까지 유보" + "[원금] 기준 안분"

**검증 포인트**:
- CLAUDE.md: `모든 [ ] 안에는 [원금]이라고 기재` — 코드에서 `[원금]` 이 정확히 3회 나오는지?
- 미확정 채권 목록(어떤 채권이 미확정인지)을 별도로 보여줘야 하는지?

### 2-7. 섹션 8 "변제금원의 회생위원에 대한 임치 및 지급"

**추가된 로직**:
- 해당 항 번호 자동 산출: 3항(재단채권있으면), 4항(우선채권있으면), 5항(별제권있으면), 6항(항상), 7항(미확정있으면)

**검증 포인트**:
- CLAUDE.md: "3항~5항 및 7항 중 해당 있는 항, 6항은 항상 포함" — 로직 맞는지?
- 항 번호가 동적인데, 실제 법원서식에서 항 번호가 고정(1-10)인지 동적인지?

### 2-8. 섹션 9 "면책의 범위 및 효력발생시기"

**추가된 문구**: 법 §624 기반 고정 문구

**검증 포인트**:
- CLAUDE.md: "특별한 사정 없으면 양식 문구 그대로" — 현재 문구가 법원 양식 원문과 일치하는지?
- `§625조 제2항` 인용이 정확한지?

### 2-9. 섹션 10 "기타사항"

**추가된 로직**:
- `planSections`에서 `section_key === 'etc' || section_number === 10` 찾기
- 있으면 "해당있음" + 내용, 없으면 "해당없음"

**검증 포인트**:
- `planSections` 데이터가 실제 DB에서 어떤 구조로 오는지 확인
- `section_key`가 `'etc'`인 데이터가 실제로 생성/저장되는 경로가 있는지?

---

## 3. monthly-available.ts — 회생위원 보수 공식 수정

**변경 전**:
```ts
trusteeCommission = Math.round((input.monthlyIncome * commissionRate) / 100)
raw = monthlyIncome - livingCost - childSupport - trusteeCommission
```

**변경 후**:
```ts
preCommissionAvailable = monthlyIncome - livingCost - childSupport  // ③
trusteeCommission = Math.round((preCommissionAvailable * commissionRate) / 100)  // ④
raw = preCommissionAvailable - trusteeCommission  // ⑤
```

**검증 포인트**:
- CLAUDE.md: `④ 회생위원 보수 = ③가용소득 × 1%` — ③은 소득 - 생계비 - 양육비. 맞는지?
- 변경 전에는 **월소득** 기준이었는데 **가용소득** 기준으로 바뀜 → 기존 저장된 사건 데이터에 영향은?
- `computeMonthlyAvailable()` 반환값 중 `trusteeCommission` 필드가 존재하는지 확인 필요
  (document-generator.ts 섹션 3에서 `monthlyResult.trusteeCommission` 참조)
- `extraFamilyLowMoney` (추가생계비)가 `preCommissionAvailable` 계산에 포함되어야 하는지?
  현재 코드에서 `livingCost.applied`에 이미 포함되어 있는지?

---

## 4. repayment-calculator.ts — 동일한 보수 공식 수정

**변경 전**: `available = Math.round(available * (1 - trusteeCommRate / 100))`
**변경 후**:
```ts
preCommission = monthlyIncome - totalExpense
commission = Math.round((preCommission * trusteeCommRate) / 100)
return preCommission - commission
```

**검증 포인트**:
- `monthly-available.ts`와 **동일한 결과**를 내는지? (두 파일의 공식이 일치해야 함)
- 변경 전 공식 `available * (1 - rate/100)` vs 변경 후 `available - Math.round(available * rate/100)`
  → 수학적으로 다른 결과 나옴 (round 시점 차이). 어느 쪽이 정확한지?
- 이 함수를 호출하는 곳 (`calculateRepaymentPlan` 등)에서 사이드이펙트 없는지?

---

## 5. schedule-generator.ts — 마지막 채권자 음수 방어

**변경 전**: `monthly = monthlyRepay - monthlyAllocated`
**변경 후**: `monthly = Math.max(0, monthlyRepay - monthlyAllocated)`

**검증 포인트**:
- 올림(ceil)이 누적되면 `monthlyAllocated > monthlyRepay`가 되어 음수 가능 — 방어 맞음
- 그런데 `Math.max(0, ...)`으로 0이 되면 마지막 채권자가 **0원 배분** → 법적으로 문제 없는지?
- CLAUDE.md: "올림 결과, (H)합계가 (A)월가용소득보다 약간 많아지는 것이 정상" — 0원 방어 대신
  마지막 채권자에게도 최소 1원은 배분해야 하는지?
- total도 같은 방어 적용됨 — total이 0이면 해당 채권자 총변제액이 0원이 됨

---

## 6. case-actions.ts — 사건 생성 시 case_clients 자동 연결

**추가된 코드** (createCaseAction 내부):
```ts
const clientName = formData.get('clientName')?.trim();
if (clientName) {
  await supabase.from('case_clients').insert({
    organization_id, case_id, client_name: clientName,
    relation_label: clientRole || '의뢰인',
    is_portal_enabled: false, link_status: 'linked',
    created_by: actorId, updated_by: actorId,
  });
}
```

**검증 포인트**:
- `case_clients` 테이블 스키마와 insert 컬럼이 일치하는지 (필수 NOT NULL 컬럼 누락 없는지)
- `client_email_snapshot`이 NULL이면 unique 제약조건 `(case_id, client_email_snapshot)`에 문제 없는지?
  (NULL + NULL은 PostgreSQL에서 unique 위반 아님 — 맞는지 확인)
- `profile_id`가 NULL인 provisional 레코드 → 나중에 초대 수락 시 profile_id가 연결되는 플로우가 있는지?
- CLAUDE.md: "의뢰인 초대는 사건/허브 문맥과 연결 단계를 분리" — 이 자동 연결이 규칙에 맞는지?
- 에러 처리가 `try/catch`로 non-fatal인데, 실패 시 사용자에게 알림이 없음 — OK인지?
- **revalidatePath 누락**: case_clients가 바뀌었는데 관련 경로 revalidate 안 함
  (아래의 `finalizeCreateCase`에서 처리되는지 확인)

---

## 7. notifications.ts — 표시 쿼리에 status='active' 필터 추가

**변경**: `.eq('status', 'active')` 1줄 추가

**검증 포인트**:
- 기존에 status 필터 없이 모든 non-trashed 알림을 보여주던 게 의도적이었을 수도 있음
- `status` 컬럼 값 종류: 'active', 'resolved', 'deleted' 등 — 'resolved' 상태 알림이 목록에서
  사라지는 것이 올바른 UX인지?
- count 쿼리와 display 쿼리의 기준이 이제 일치하는지 재확인:
  - count: `.eq('status', 'active').is('read_at', null)` (unread + active)
  - display: `.eq('status', 'active')` (active 전체, read/unread 무관)
  - → count는 "active AND unread"이고 display는 "active 전체" — 여전히 불일치 아닌지?
- `getNotificationQueueView()`나 `getDashboardRecentNotifications()`에도 같은 필터가 필요한지?

---

## 8. dashboard-hub-client.tsx — 조직소통 대화방 빈 상태 개선

**변경**: `<p>` 텍스트 → CLAUDE.md 빈 상태 패턴 (아이콘 + 안내 + 다음 행동)
**추가 import**: `MessageSquare` from lucide-react

**검증 포인트**:
- CLAUDE.md 빈 상태 패턴: `Icon + font-medium 제목 + text-sm 안내` — 맞는지?
- `MessageSquare`가 이 컨텍스트에 적절한 아이콘인지?
- 조직소통이 **항상 비어있는 근본 원인**도 조사 필요:
  - 메시지 저장/조회 쿼리가 실제로 작동하는지
  - `case_messages` 테이블에 데이터가 있는지
  - `case_id` NULL 허용 migration이 적용되었는지 (코드에 migration 경고 있음)

---

## 전체 크로스체크 요청

1. **정합성**: `monthly-available.ts` vs `repayment-calculator.ts` — 두 파일의 가용소득 계산이 동일한 결과를 내는지
2. **정합성**: `document-generator.ts` 인라인 계산 vs 각 모듈 함수 (`leibniz.ts`, `repayment-rate.ts`, `secured-allocation.ts`) — 같은 공식을 쓰는지
3. **CLAUDE.md 22개 체크리스트**: 이번 변경이 위반하는 항목이 있는지 전수 검사
4. **기존 테스트**: `src/lib/rehabilitation/__tests__/` 아래 테스트가 있다면 실행하고 통과하는지
5. **regression**: 기존에 저장된 사건 데이터로 변제계획안을 생성했을 때, 변경 전/후 결과 차이 확인

---

## CLI 실행 제안

```bash
# 1. 변경 확인
git diff --stat
git diff

# 2. typecheck
npx tsc --noEmit

# 3. 테스트 (native binding 이슈 있으면 로컬에서)
npx vitest run src/lib/rehabilitation/

# 4. 빌드
npx next build

# 5. 문제 있으면 원복
git checkout -- <file>
```
