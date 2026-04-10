# Vein Spiral 변제계획안 로직 현재 상태

**조사일**: 2026-04-06
**조사자**: cowork (조사관)
**스캔 범위**: `src/lib/rehabilitation/*.ts` 전수

## 1. 파일 구성

| 파일 | 줄수 | 역할 |
|---|---|---|
| `repayment-calculator.ts` | 225 | 월가용·변제기간·월변제액·청산가치보장 |
| `schedule-generator.ts` | 104 | 채권자별 월별 배분 |
| `property-valuation.ts` | 109 | 재산 14 카테고리 청산가치 합산 |
| `median-income.ts` | 55 | 기준중위소득 60% 테이블 (2024~2026) |
| `secured-allocation.ts` | 115 | 별제권 배분 |
| `types.ts` | 164 | 공통 타입 |
| `validators.ts` | 99 | 주민/전화/금액 포맷 |
| `document-generator.ts` | 1727 | 법원 서류 생성기 |

## 2. 월가용소득 공식 (`calculateMonthlyAvailable`)

```
available = monthlyIncome - (livingCost + extraLivingCost + childSupport)
if trusteeCommRate > 0:
    available = round(available × (1 - trusteeCommRate/100))
```
- 항목: 월소득, 생계비, 추가생계비, 양육비, 회생위원 보수율(%)
- colaw와 **항목 구조 동일** ✓
- 단 trusteeCommRate 차감이 **가용소득 산출 후 곱셈식** — colaw가 월소득 기준인지 가용소득 기준인지 미확인

## 3. 변제기간 옵션 (`RepayPeriodOption` 5가지)

| VS enum | VS 로직 | colaw 대응 |
|---|---|---|
| `capital60` | 60개월 고정, target = 원금 | 1. 원금 60개월 ✓ |
| `both60` | 60개월 고정, target = 원리금 | 2. 원리금 60개월 ✓ |
| `capital100_5y` | `max(36, min(60, ceil(원금/가용)))`, extra5y 시 target=원리금 | 3. 3년 이상 5년 내 원금 100% ✓ |
| `capital100_3y` | `min(36, ceil(원금/가용))`, extra3y 시 target=원리금 | 4. 3년 내 원금 100% ✓ |
| `full3y` | 36개월 고정, capitalOnly 시 target=원금 | 5. 3년 내 원금+이자 전부 ✓ |
| **(없음)** | — | **6. 원금만 변제** ✗ |

**중대 갭**: colaw 옵션 6 "원금만 변제"가 VS에 독립 enum으로 없다. `full3y + capitalOnly=true` 조합으로 유사하게 쓰지만 **colaw는 36개월 고정이 아님**. 김한경 케이스가 정확히 이 유형이고 실제 값 36개월이 저장된 이유가 무엇인지(고정인지, 별도 계산인지) 미확인.

## 4. 월변제액 산출

```
monthlyRepay = min(monthlyAvailable, ceil(targetAmount / repayMonths))
```
- 라운딩: **ceil (올림)**
- 청산가치보장 검증:
  ```
  if monthlyRepay × months + disposeAmount < liquidationValue:
      monthlyRepay = ceil((liquidationValue - disposeAmount) / months)
  ```
- **라이프니츠 현가계수 없음** — `liquidationValue`를 이미 계산된 값으로 받음

## 5. 청산가치 (`property-valuation.ts`)

14 카테고리 합산 + 공제:
- 현금, 예금(250만원 공제), 보험(보장성 250만원 공제), 자동차, 임차보증금, 부동산, 사업설비, 대여금, 매출금, 퇴직금(1/2 반영), (가)압류적립금, 공탁금, 기타, 면제재산(0)

**수식**: `liquidationValue = Σ(카테고리 소계 - 공제)`

**갭**:
- 단순 합산. **라이프니츠 현가계수 할인 없음**
- colaw의 `leibniz` 필드(30.7719), `nowvalue`(18,961,470), `except_leibniz` 플래그 대응 **전무**

## 6. 생계비 로직 (`median-income.ts`)

```ts
getLivingCost(year, dependentCount):
    return MEDIAN_INCOME_60[year][householdSize - 1]
```

- 2026년 1인 = 1,538,543원 (보건복지부 고시)
- **단순 조회만 반환** — 하향 조정, 증액률, 기준범위 분기 모두 없음
- colaw의 `lowMoney`(최저선, 기중 40%), `maxMoney`(상한 60%), `lowestlivingmoneyrate`(조정률), `livingmoneycalcumethod`(1=범위내/2=초과) 개념 **전무**

**확인**: 김한경 생계비 1,538,543원은 VS와 colaw가 **수치상 일치**. 단 colaw는 `lowMoney 1,025,695~maxMoney 1,538,543` 범위에서 사용자 조정 가능, VS는 1,538,543 고정.

## 7. 채권자별 배분 (`schedule-generator.ts`)

- 비율: `creditorDebt / totalDebt`
- `sequential`: 원금 먼저 변제 후 이자
- `combined`: 원금·이자 비율 동시 변제
- 마지막 채권자에 반올림 오차 보정 (잔여분 배분)
- 라운딩: `Math.round`

colaw의 `comparisonssumprincipalinterest`(원리금 합산 비교), `paymentratepointdisplay`(변제율 소수점), `interestreportdisplay`(이자변제 변제율 표시) 같은 표기·비교 제어 **없음**.

## 8. `gross_salary = 0` 시 동작

`calculateRepayment` 97행:
```ts
if (monthlyAvailable <= 0) {
    return null;
}
```

- 함수가 `null` 반환
- **에러 토스트 없음** — 호출측이 null을 어떻게 처리하는지에 달림
- UI/서버 액션에서 null 처리 경로 추가 조사 필요

→ 사용자가 "비어있으면 원인을 알 수 없다"고 한 현상의 출처로 강하게 의심됨.

## 9. 요약

VS 현재 로직은 **단순화된 개인회생 계산기** 수준이며 colaw가 사용하는:
- 6번째 변제기간 옵션
- 생계비 범위 조정 (하향·상향)
- 라이프니츠 현가계수 청산가치 할인
- `livingmoneycalcumethod` 분기
- 변제율 표기 제어
- 이자 표시 제어
- 자동계산 플래그 (`auto_calculate_type`, `autocalculationmethod`)

가 모두 **미구현**이다. 원 단위 일치는 이식 전 불가능.
