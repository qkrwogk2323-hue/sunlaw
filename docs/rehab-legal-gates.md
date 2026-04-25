# 개인회생 법률 강제표 — 경고가 아니라 게이트

> 목적: "경고만 띄우고 저장·출력을 허용"하는 구조를 "법률상 불가능한 상태에서는 저장·출력 차단"으로 바꾸기 위한 규칙표
> 원칙: 아래 표의 "차단" 행은 override_reason(사유) 없이는 저장 또는 출력이 물리적으로 막혀야 한다

---

## 1. 별제권부 채권 저장 조건

| 조건 | 충족 시 | 미충족 시 | 차단 여부 |
|------|---------|---------|---------|
| `is_secured=true`이면 `secured_collateral_value > 0` | 저장 허용 | **저장 차단** — "담보평가액을 입력하세요" | 차단 |
| `is_secured=true`이면 담보물건 근거(lien_type, property 연결 또는 수동 입력) 존재 | 저장 허용 | 경고 — "담보 근거가 없습니다. 부속서류 1에 빈 행이 생깁니다" | 경고 |
| `secured_collateral_value`가 `capital+interest`보다 큰 경우 | 경고 — "담보평가액이 채권액을 초과합니다" | — | 경고 |

**입력 필드**: `is_secured`, `secured_collateral_value`, `lien_type`, `secured_property_id`
**DB 컬럼**: `rehabilitation_creditors.secured_collateral_value`
**계산 함수**: `classifyCreditor()`, `buildCaseSnapshot().securedAttachment`
**출력 문서**: D5106 상단 요약, 부속서류 1, 변제계획안 5항/6항/별표(1)
**저장 차단**: `secured_collateral_value=0`이면 채권자 저장 차단

---

## 2. 보증채무 저장 조건

| 조건 | 충족 시 | 미충족 시 | 차단 여부 |
|------|---------|---------|---------|
| `bond_type='보증채무'`이면 `parent_creditor_id` 존재 | 저장 허용 | **저장 차단** — "주채무자를 연결하세요" | 차단 |
| 보증채무이면 `is_secured=false` 강제 | 자동 처리됨 | — | 자동 |
| 보증채무 + `guarantor_amount=0` + `is_unsettled=false`이면 `is_unsettled=true` 자동 | 자동 처리됨 | — | 자동 |

**입력 필드**: `bond_type`, `parent_creditor_id`
**출력 문서**: D5106 채권자 row (가지번호), 10항 장래구상채권 clause

---

## 3. 장래구상채권 clause 생성 조건

| 조건 | clause | 비고 |
|------|--------|------|
| `bond_type ∈ ['보증채무','연대보증']` 또는 `guarantor_amount > 0` | 장래구상채권 처리 clause | 채권번호·채권자명·금액 특정 |
| 해당 채권 삭제 시 | clause 자동 제거 | |

**계산 함수**: `buildSection10Clauses()`, `buildCaseSnapshot().section10Clauses`
**출력 문서**: 변제계획안 10항

---

## 4. D5110 vs D5111 선택 기준

| 조건 | 양식 | 비고 |
|------|------|------|
| `presentValue(monthlyRepay, months) > liquidationValue` | D5110 (가용소득만) | |
| `presentValue(monthlyRepay, months) ≤ liquidationValue` | D5111 (가용소득+재산처분) | 월 변제액 강제 상향 |
| `liquidationValue = 0` | D5110 | 재산 없음 |

**사용자 선택 아님** — 시스템이 자동 판정. 사용자는 기간·생계비를 조정하여 간접적으로 영향.
**계산 함수**: `determineFormType()`, `buildCaseSnapshot().isD5111`
**출력 문서**: 변제계획안 2항 "나.재산", 5항, 9항, 별표(1)

---

## 5. 변제기간 선택 기준

| 기간 | 조건 | 비고 |
|------|------|------|
| 36개월 | 기본값 (period_setting=6, capital36) | |
| 48개월 | 청산가치 미충족 시 자동 연장 (forcedMonths 없을 때만) | |
| 60개월 | 48개월로도 미충족 시 | 최장 한도 |
| 72개월 이상 | **절대 불가** — 법 §611② | 차단 |

**입력 필드**: `repay_period_option` (선택), `forcedMonths` 없으면 자동
**저장 차단**: 72개월 이상 입력 시 차단
**출력 문서**: 변제계획안 1항 기간, 별표(1) 회차 수

---

## 6. 생계비 규칙

| 조건 | 처리 | 차단 여부 |
|------|------|---------|
| `living_cost_rate=100` (기준중위소득 60% 그대로) | 정상 | — |
| `living_cost_rate < 100` (60% 미만) | 경고 — "법원 인정 사유 소명 필요" | 경고 (저장 허용) |
| `living_cost_rate > 200` | **저장 차단** — "이례적 승인 필요. override_reason 기재" | 차단 |
| 수동 입력 생계비가 `기준중위소득 60% × rate/100`와 불일치 | 경고 — "권장선과 다릅니다" | 경고 |

**입력 필드**: `living_cost_rate`, `living_cost` (수동), `income_year`, 부양가족 수
**DB 컬럼**: `rehabilitation_income_settings.living_cost`, `living_cost_rate`
**계산 함수**: `minimumLivingCost()`, `adjustLivingCost()`
**출력 문서**: 수입지출목록 Ⅱ, 변제계획안 2항

---

## 7. PDF 출력 허용 조건

| 조건 | 충족 시 | 미충족 시 | 차단 여부 |
|------|---------|---------|---------|
| `net_salary > 0` | 허용 | **차단** — "월 소득을 입력하세요" | 차단 |
| `living_cost > 0` | 허용 | **차단** — "생계비를 설정하세요" | 차단 |
| 담보 채권 있으면 `secured_collateral_value > 1` (기본값 폴백 아님) | 허용 | **차단** — "담보평가액을 입력하세요" | 차단 |
| `repayment_start_date` 존재 | 허용 | 경고 — "변제개시일 미설정, '변제개시일'로 대체" | 경고 |
| 보증채무가 있으면 `parent_creditor_id` 연결 | 허용 | **차단** — "보증채무 주채무자 미연결" | 차단 |

---

## 8. CSV 출력 허용 조건

| 조건 | 충족 시 | 미충족 시 | 차단 여부 |
|------|---------|---------|---------|
| 채권자 1건 이상 저장됨 | 허용 | **차단** | 차단 |
| PDF와 같은 snapshot hash | 허용 | 경고 — "저장 후 CSV를 다시 생성하세요" | 경고 |

---

## 9. 미리보기 ↔ 출력 snapshot 일치 조건

| 조건 | 처리 |
|------|------|
| 미리보기 요약 숫자와 문서 생성 snapshot이 같은 hash | 정상 |
| hash 불일치 | 다운로드 버튼 비활성화 + "데이터가 변경되었습니다. 새로고침 후 다시 시도하세요" |

---

## 10. 구현 우선순위

| P | 게이트 | 영향 |
|---|--------|------|
| P0 | 담보 채권 `secured_collateral_value > 0` 강제 (#1) | 담보부/무담보 분류 전체 |
| P0 | 보증채무 `parent_creditor_id` 필수 (#2) | 가지번호, 10항 clause |
| P0 | PDF 출력 전 필수 입력 검증 (#7) | 불완전 문서 생성 차단 |
| P1 | 생계비 rate > 200 차단 (#6) | 이례적 값 방지 |
| P1 | snapshot hash 기반 CSV 검증 (#8, #9) | 불일치 파일 생성 차단 |
| P2 | D5110/D5111 자동 판정 안내 개선 (#4) | 사용자 이해도 |
