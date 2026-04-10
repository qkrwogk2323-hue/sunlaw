# P0 포팅 디렉티브 — colaw 개인회생 계산 로직 VS 이식 (2026-04-06)

> **대상**: CLI Opus executor (DB/코드 적용 담당)
> **작성 근거**: 김한경 케이스(cs=5640948, rs=210485, dy=2025) colaw 변제계획안 실수치 대조 (`docs/reports/colaw-repayment-plan-anatomy.md` §9) + VS 현황 스캔(`docs/reports/vs-repayment-plan-current-state.md`) + 사전조사(`docs/rehab-ux-issues-report-2026-04-04.md`, `scripts/colaw-migration/vs-business-logic-verification.md`).
> **원칙**: 데이터 이식이 아니라 **기능 이식**. VS에서 새로 입력한 케이스도 colaw와 동일 수치로 계산되어야 함.
> **검증 케이스(기준)**: 김한경 36개월, 월가용 561,457원, 총변제 20,212,548원, 변제율 39%, (K)→(L) 할인 18,961,470원.

---

## P0-1. 라이프니츠 현가계수 적용 (GAP-04 확정)

### 근거 수치 (김한경 page 9)

| 기호 | 값 |
| --- | --- |
| (K) 가용소득 총변제예정액 | 20,212,548원 |
| (L) (K)의 현재가치 | 18,961,470원 |
| 월가용(⑥) | 561,457원 |
| 변제횟수 | 36회 |

**역산 라이프니츠 36개월 계수 = 18,961,470 ÷ 561,457 = 33.7702**

### 구현 지시

**파일**: `src/lib/rehabilitation/property-valuation.ts`, `src/lib/rehabilitation/repayment-calculator.ts`, `src/lib/rehabilitation/types.ts`

1. `src/lib/rehabilitation/leibniz.ts` 신규 파일 생성:
   ```ts
   // 민법 정기금 라이프니츠 현가계수 테이블 (colaw 역산 기준, 월 단위)
   // 초안 값: 36개월 = 33.7702 (김한경 케이스 역산)
   // TODO: 24/48/60개월 계수는 해당 기간 케이스 확보 후 보강
   export const LEIBNIZ_MONTHLY: Record<number, number> = {
     36: 33.7702,
   };

   export function getLeibnizCoefficient(months: number): number | null {
     return LEIBNIZ_MONTHLY[months] ?? null;
   }

   /** 월가용 × 계수 = 현재가치 */
   export function discountByLeibniz(monthlyAvailable: number, months: number): number | null {
     const k = getLeibnizCoefficient(months);
     if (k == null) return null;
     return Math.round(monthlyAvailable * k);
   }
   ```

2. `types.ts`의 `RepaymentResult`에 `presentValue: number | null` 추가.
3. `repayment-calculator.ts`의 `calculateRepayment()` 결과에 `presentValue = discountByLeibniz(monthlyAvailable, months)` 세팅.
4. `src/lib/rehabilitation/property-valuation.ts`의 `calculateLiquidationValue`는 **건드리지 않음** — 청산가치 자체는 재산 합계(단순 합)이 맞음. 변경 대상은 "(K)→(L) 변제금의 현재가치 할인"이지, "재산의 현재가치 할인"이 아님.
5. 변제계획안 템플릿(`document-generator.ts`)에 (K)와 (L) 각각 표기 추가.

### 계수 미보유 시 동작

`getLeibnizCoefficient(months) == null` 이면 `presentValue = null`로 두고 UI는 "현재가치: — (계수 미확정 기간)"로 표시. 계산 흐름은 중단하지 않음.

### 검증

김한경 케이스로 단위 테스트:
```ts
expect(discountByLeibniz(561457, 36)).toBe(18961470);
```

---

## P0-2. 계단식 조세우선 변제 배분 (신규 GAP)

### 근거 구조 (김한경 page 10~12)

| 구간 | 회차 | 월액 | 대상 | 소계 |
| --- | --- | --- | --- | --- |
| 1 | 1~12 | 561,457 | **인천세무서 단독** | 6,737,484 |
| 2 | 13 | 561,461 | 인천세무서 329,806 + 무담보 9곳 231,655 | 561,461 |
| 3 | 14~36 | 561,461 | 무담보 9곳 | 12,913,603 |
| **합계** | 36 | — | — | **20,212,548** ✓ |

**핵심**: 인천세무서(조세채권 = 재단채권 = 우선권) 7,067,290원이 **1~13회차에 전액 우선 완납**된 뒤 나머지 기간은 무담보 채권자에게 pro-rata 배분. VS `schedule-generator.ts`의 `sequential`/`combined` 모드는 이 "채권자가 시기별로 교체되는 계단식 구조"를 재현하지 못함.

### 구현 지시

**파일**: `src/lib/rehabilitation/schedule-generator.ts`, `src/lib/rehabilitation/types.ts`

1. `RepaymentMode`에 `'tieredTaxPriority'` 추가.
2. 채권자 데이터에 `priority_class: 'tax_priority' | 'secured' | 'unsecured'` 필드 가정(이미 있으면 사용, 없으면 `creditor_kind === '조세채권' || ...` 으로 분류).
3. `generateRepaySchedule`에 `tieredTaxPriority` 브랜치 추가:
   ```ts
   function generateTieredSchedule(input) {
     const taxClaims = creditors.filter(c => c.priority_class === 'tax_priority');
     const others = creditors.filter(c => c.priority_class !== 'tax_priority');
     const monthly = input.monthlyAvailable;
     const months = input.months;
     const taxTotal = sum(taxClaims.map(c => c.amount));

     // 1단계: 조세채권 완납까지 월 전액을 조세채권 pro-rata 배분
     const taxFullMonths = Math.floor(taxTotal / monthly); // 12
     const taxRemainder = taxTotal - taxFullMonths * monthly; // 329,806

     // 2단계: (taxFullMonths+1)회차에 조세 잔여 + 무담보 혼합
     // 3단계: 이후 회차는 무담보만 pro-rata

     // 각 회차별 배분 레코드 생성
     // ...
   }
   ```
4. 단일 채권만 있거나 조세채권이 없으면 기존 `sequential`/`combined`로 폴백.
5. 마지막 회차 라운딩 흡수는 "무담보 구간의 마지막 회차" 기준으로 유지.

### 검증

김한경 데이터로 단위 테스트 — 3구간 월액, 구간별 합, 전체 총변제액이 anatomy §9.5 표와 원 단위 일치해야 통과.

---

## P0-3. 확정 / 미확정 채권 분리 (신규 GAP)

### 근거 (김한경 제이비우리캐피탈 케이스)

- 채권자 #2 제이비우리캐피탈(주) 자동차담보대출 13,155,499원이 **전체 구간 "미확정(유보)"** 으로 분류됨.
- colaw는 월변제표에서 `확정채권액(원금)` 컬럼과 `미확정채권액(원금)` 컬럼을 **2열로 병렬 표기**.
- 13회차 배분: 확정 493,885원 + 미확정 67,576원 = 561,461원
- 14~36회 배분: 확정 397,676원 + 미확정 163,785원 = 561,461원
- 전체 합계(page 13): 확정 16,377,917 + 미확정 3,834,631 = 20,212,548원

### 구현 지시

**파일**: 마이그레이션(`supabase/migrations/XXXX_creditors_confirmation_status.sql`), `src/lib/rehabilitation/schedule-generator.ts`, `src/lib/rehabilitation/types.ts`, `src/lib/rehabilitation/document-generator.ts`

1. 신규 마이그레이션:
   ```sql
   alter table rehabilitation_creditors
     add column if not exists confirmation_status
       text not null default 'confirmed'
       check (confirmation_status in ('confirmed', 'unconfirmed'));
   ```
2. `types.ts`의 `Creditor`에 `confirmationStatus: 'confirmed' | 'unconfirmed'` 추가.
3. `tieredTaxPriority` 배분 결과 레코드가 `confirmedAmount`, `unconfirmedAmount` 두 컬럼을 모두 가지도록 확장.
4. 월변제표(`document-generator.ts`)에 확정/미확정 2열 표기 추가.
5. 기본값은 `confirmed` — 기존 VS 데이터는 전원 confirmed로 간주(회귀 없음).
6. colaw 마이그레이션 스크립트(`scripts/colaw-migration/migrate-colaw-to-vs.ts`)에서 `creditbonds` 쪽 "미확정" 플래그(field명 확인 필요: `noconfirmyn` 등)를 `unconfirmed`로 매핑.

### 검증

김한경 재진행 — 제이비우리캐피탈이 unconfirmed로 플래그되고, 월변제표 합이 anatomy §9.5와 원 단위 일치.

---

## P0-4. 잔여 zero-salary 케이스 조사 (GAP-08 재범위)

### 현황

`vs-business-logic-verification.md` §51에 따르면 2026-04-06 다음 UPDATE가 실행되어 **39건** 수정 완료:
```sql
UPDATE rehabilitation_income_settings
SET net_salary = gross_salary
WHERE net_salary = 0 AND gross_salary > 0;
```

초기 "49건 zero-salary" 중 39건은 위 UPDATE로 해결됨. 그러나 여전히 0원인 **잔여 10건**이 존재할 것으로 추정(정확한 수 재확인 필요).

### 지시 (조사형, 코드 변경 없음)

1. 다음 쿼리 실행:
   ```sql
   select
     c.id as case_id,
     c.case_title,
     ris.net_salary,
     ris.gross_salary,
     ris.living_cost
   from rehabilitation_cases c
   join rehabilitation_income_settings ris on ris.case_id = c.id
   where coalesce(ris.net_salary, 0) = 0
     and c.lifecycle_status != 'soft_deleted'
   order by c.created_at desc;
   ```
2. 결과 건수와 케이스 ID 목록을 `docs/reports/zero-salary-residual-2026-04-06.md`에 기록.
3. 각 케이스에 대해 colaw 원본의 `tagyeosalary`, `monthaverageincomemoney`, `netsalary`, `realincome` 필드 중 어느 것에 값이 있는지 재확인 → 매핑 보강 필요 여부 결정.
4. **코드 수정은 매핑 원인 확정 후에만**. 본 P0 디렉티브에서는 조사까지만.

### 추가 UX 지시 (GAP-08 안전망)

`calculateRepayment`가 `monthlyAvailable <= 0`이면 현재 silent `null` 반환. 이를 다음으로 변경:
```ts
return {
  ok: false,
  code: 'NON_POSITIVE_AVAILABLE',
  userMessage: '월 가용소득이 0 이하입니다. 소득 또는 생계비를 확인해주세요.',
  debug: { monthlyIncome, livingCost, available },
};
```
UI는 이 결과를 받아 빈 변제계획안이 아니라 **에러 배너 + 수정 경로 링크**를 표시해야 함(`ClientActionForm` 에러 처리로 충분).

---

## P1 (후속, 본 P0 이후)

- **P1-1 생계비 하향 조정 + 추가생계비 탭** (GAP-02/03): 기준중위소득 60%를 상한으로 두고 사용자가 내릴 수 있는 숫자 입력 + 별도 `extra_living_cost` 탭.
- **P1-2 B_19 10항 이하 자동문구 엔진**: colaw `B_19` 리포트의 "기본문구 추가", "직업 및 수입상황신고의무 문구변경", **위험 토스트**를 VS 변제계획안 문서에 포팅. 스코프/토스트 문구 수집은 별도 anatomy 단계 필요.
- **P1-3 변제기간 자동결정 로직** (GAP-13): 6가지 변제기간 규칙 + 3가지 수동 옵션 이식.
- **P1-4 변제율 표기 소수자리 제어** (GAP-05).

---

## 반드시 CLI에 전달해야 할 검증 체크포인트

본 P0 작업이 끝나면, 김한경 케이스를 VS UI에서 재계산했을 때 다음 수치가 모두 원 단위 일치해야 함:

| 항목 | 목표값 | 근거 |
| --- | --- | --- |
| 변제기간 | 36개월 | anatomy §9.3 |
| 월가용소득 | 561,457원 | anatomy §9.3 ⑥ |
| 총변제예정액 (K) | 20,212,548원 | anatomy §9.4 |
| 현재가치 (L) | 18,961,470원 | anatomy §9.4 |
| 변제율(원금) | 39% | anatomy §9.3 |
| 1~12회차 월변제 | 561,457원 (인천세무서 단독) | anatomy §9.5 |
| 13회차 월변제 | 561,461원 (인천세무서 329,806 + 무담보 231,655) | anatomy §9.5 |
| 14~36회차 월변제 | 561,461원 (무담보만) | anatomy §9.5 |
| 확정 합 | 16,377,917원 | anatomy §9.5 |
| 미확정 합 | 3,834,631원 | anatomy §9.5 |

한 자리라도 어긋나면 작업 미완료로 간주.

---

## 작업 제외 — CLI는 건드리지 말 것

- colaw 사건 목록 추가 재추출 (이건 investigator 역할)
- `rehabilitation_creditors` 기존 row에 대한 `confirmation_status` 일괄 재분류 (사전조사 후 별도 작업)
- P1 항목 전체
