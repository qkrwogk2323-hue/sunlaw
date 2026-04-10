# 변제계획안 갭 분석 (colaw ↔ Vein Spiral)

**작성일**: 2026-04-06
**기준 문서**: `colaw-repayment-plan-anatomy.md`, `vs-repayment-plan-current-state.md`
**목적**: colaw의 변제계획안 자동작성 로직을 VS에 원 단위로 이식하기 위한 갭 목록과 수정 지시 기반

분류:
- **B**: 버그 (VS가 틀리게 동작. 즉시 수정)
- **M**: 미구현 (VS에 기능 없음. 추가 필요)
- **P**: 정책 결정 필요 (사용자 확정 필요)
- **V**: 검증 필요 (추가 조사)

---

## GAP-01 [M] 변제기간 옵션 6번 "원금만 변제"

- colaw: `repaymentperiodsetting=6` 독립 규칙. 기간은 별도 로직으로 결정 (김한경 36개월)
- VS: `full3y + capitalOnly=true` 조합으로 유사 구현, 단 36개월 고정
- 필요: `RepayPeriodOption`에 `capitalOnlyFlexible` 신규 enum 추가, 기간 결정 로직 분리
- 테스트: 김한경 건이 36개월로 재현되는 조건 규명

## GAP-02 [M] 생계비 범위 조정 (하향)

- colaw: `lowMoney`(기중 40% 수준) ~ `maxMoney`(기중 60%) 사이에서 사용자 조정 가능
- VS: `livingCost` 단일 값. 조정 UI·로직 없음
- 필요:
  - `median-income.ts`에 `getLivingCostRange(year, dep)` 추가 → `{min, max}` 반환
  - `RepaymentInput.livingCost` 입력 시 `min ≤ livingCost ≤ max` 검증
  - UI 슬라이더/입력 필드 추가 (수입지출 탭)
- **정책 확인 완료**: 기준중위소득 60%를 기본값으로 하되, 그 아래로 사용자 조정 가능해야 함 (사용자 확정)

## GAP-03 [M] 추가생계비 (기준범위 초과)

- colaw: `usingfamily_low_money` 필드, `livingmoneycalcumethod=2` 선택 시 사용
- VS: `extraLivingCost` 필드 존재, 단 기준범위 초과 검증 없음
- 필요:
  - `livingmoneycalcumethod` 분기를 `RepaymentInput`에 추가
  - 값 2 선택 시 초과분을 `extraLivingCost`로 받고, 초과 사유 필드 추가
  - 법원 심사용 증빙 첨부 플로우 (추가생계비 탭과 연동)
- **정책 확인 완료**: colaw에 "추가생계비 탭"이 있으므로 VS도 별도 탭으로 분리 구현 필요

## GAP-04 [M] 라이프니츠 현가계수 청산가치 할인

- colaw: `leibniz` 30.7719 (36개월 기준), `nowvalue` 18,961,470 (할인 후)
- VS: 라이프니츠 계수 테이블·로직 전무. `liquidationValue`를 액면가로 사용
- 필요:
  - `leibniz-coefficients.ts` 신규: `{months → coefficient}` 테이블 (대법원 월단위 호프만/라이프니츠)
  - `property-valuation.ts`에 `applyLeibnizDiscount(faceValue, months, exclude)` 추가
  - `except_leibniz` 플래그 `RepaymentInput`에 추가
- **영향**: 이것이 미적용이면 모든 사건의 청산가치가 과대 계산되어 월변제액이 잘못 산출됨
- 검증: 김한경 케이스에서 재산 액면가 × 30.7719/36 ≒ 18,961,470 확인 필요

## GAP-05 [M] 변제율 표기 자리수 / 이자변제 표시

- colaw: `paymentratepointdisplay` (0=첫째, 1=둘째), `interestreportdisplay`
- VS: 변제율을 `(total/debt)*100` 단순 계산. 표기 자리수 옵션·이자표시 옵션 없음
- 필요: 서류 생성기(`document-generator.ts`)에서 반영

## GAP-06 [V] 월가용소득에서 회생위원 보수 차감 방식

- colaw: `outsideresuremember_rate` (%). 월소득 기준 차감인지, 가용소득 기준인지 미확인
- VS: **가용소득 산출 후** 곱셈식 차감 (`available × (1 - rate/100)`)
- 필요: colaw 실사건 2건 이상 비교해 정확한 차감 시점 확정

## GAP-07 [V] 처분재산 변제투입 (`disposeAmount`)

- colaw: 처분할 재산의 변제투입 예정액·변제기한 UI 존재 (필드명 미확정)
- VS: `disposeAmount` 단일 숫자로 총액 합산. 변제기한·변제 스케줄 미반영
- 필요: 변제기한을 `repayment_months_exclude_dispose` 같은 별도 처리로 확장

## GAP-08 [B] `gross_salary = 0` 시 사용자 알림 없음

- 현재: `calculateRepayment`가 `monthlyAvailable <= 0` 시 `null` 반환
- 증상: 화면에 변제계획안이 비어 보이지만 **원인 토스트 없음**
- 필요:
  - 서버 액션에서 null 반환을 `{ ok: false, code: 'income_missing', userMessage }` 형태로 전환
  - `inline-error.tsx` 카드로 "월소득 정보가 입력되지 않아 변제계획안을 생성할 수 없습니다. 수입지출 탭에서 월소득을 입력해 주세요." 표시
- **영향 범위**: 현재 49건이 `gross_salary=0` → 전부 원인 알림 없이 공란

## GAP-09 [M] 자동계산 플래그 (`auto_calculate_type`, `autocalculationmethod`)

- colaw: 두 필드로 자동계산 경로를 다르게 씀 (구체 의미 미확인)
- VS: 해당 개념 없음
- 필요: colaw 실제 동작 관찰 후 문서화 → 이식 여부 판단

## GAP-10 [V] 1회차 변제투입 선택

- colaw: "1회차 변제투입 선택" UI 존재
- VS: 월별 균등 변제만 지원. 1회차 특수 처리 없음
- 필요: 실제 예시 케이스 찾고 이식 여부 판단

## GAP-11 [M] 부양가족 수 소수점 (`numberDependents=1.0`)

- colaw: 1.0, 0.5 등 소수점 입력 가능 (외부 소득 반영 등 부분 부양 반영)
- VS: `dependentCount: number`지만 `getLivingCost`에서 `Math.max(0, dep)` 후 정수화되는 구조
- 필요: 가족 수 → 생계비 매핑에 소수점 보간 규칙 정의

## GAP-12 [V] `comparisonssumprincipalinterest` (원리금 합산 비교)

- colaw: select. 값 0 (기본). 다른 옵션의 의미 미확인
- VS: 없음
- 필요: 옵션 선택지 덤프 후 판단

## GAP-13 [M] 변제기간 자동 결정 로직

- colaw: `repaymentperiodsetting` 1~6 각 규칙별로 기간이 **자동으로 결정**됨 (예: 옵션 6 김한경=36)
- VS: `resolveRepayPeriod`에 규칙 일부 구현. 단 옵션 6 해당 로직 부재, 기간 결정이 `ceil(원금/가용)` 기반으로 단순화
- 필요: 각 옵션별 기간 결정 함수 분리 + colaw 실사건 기간과 대조

## GAP-14 [V] 채권자 금액 불일치 70건 근본 원인

- BLK-1에서 기존 보고된 70건 채권자 금액 불일치
- 예상 원인: 산정기준일 차이 / capital+interest 합산 방식 / 추출 버그
- 필요: 10건 샘플로 불일치 패턴 분류 → anatomy 문서에 반영

---

## 우선순위

### P0 (즉시 이식 없으면 수치 전부 틀림)
- GAP-04 라이프니츠 청산가치
- GAP-08 gross_salary=0 알림
- GAP-02 생계비 하향 조정
- GAP-03 추가생계비 별도 탭

### P1 (colaw 케이스 재현 필수)
- GAP-01 원금만 변제 옵션
- GAP-13 변제기간 자동 결정
- GAP-11 부양가족 소수점
- GAP-14 채권자 불일치 근본 원인

### P2 (표기·부가 기능)
- GAP-05 변제율 표기
- GAP-06 회생위원 보수 차감 시점
- GAP-07 처분재산 변제기한
- GAP-09 자동계산 플래그
- GAP-10 1회차 변제투입
- GAP-12 comparisonssumprincipalinterest

---

## 다음 단계

1. **#1 김한경 변제계획안 미리보기 PDF 실제 캡처** — 월별 변제표, 총변제액, 청산가치, 변제율 실수치 확보
2. **실수치 ↔ VS 계산 결과 대조** — 어느 GAP이 실제 차이를 만드는지 확인
3. **P0 4건 먼저 이식 지시서 작성** → 실행자(CLI Opus)에게 전달
4. **이식 후 재검증** → 김한경 원 단위 일치 확인
5. **다른 4~5건 샘플로 회귀 테스트**
6. **모든 케이스로 확산**
