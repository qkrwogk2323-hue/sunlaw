# 개인회생 법률 실행 명세서 v1 — rehab-rulebook

> 이 문서가 동결되기 전에는 코드 수정 금지.
> 모든 계산은 이 문서의 규칙대로만 구현한다.
> COLAW 숫자를 상수로 박지 않는다. 이 규칙에서 도출한다.

---

## 1. 핵심 값 20개 — 법원양식 근거 · 계산식 · 반올림 · 영향 문서

| # | 값 | 법원양식 근거 | 계산식 | 반올림 | 영향 문서 |
|---|---|-----------|-------|--------|---------|
| 1 | **totalDebt** | D5106 상단 합계 | `SUM(capital + interest)` 전 채권자 | 정수 | D5106 헤더, 개시신청서 |
| 2 | **totalCapital** | D5106 원금 행 | `SUM(capital)` | 정수 | D5106 헤더 |
| 3 | **totalInterest** | D5106 이자 행 | `SUM(interest)` | 정수 | D5106 헤더 |
| 4 | **securedRehabAmount** | D5106 부속서류1 ⑤합계 | `SUM(expectedRepay)` 별제권 채권 | 정수 | D5106 헤더 "담보부 회생채권액", 부속서류1 |
| 5 | **securedDeficiency** | D5106 부속서류1 ④합계 | 채권자별: `MAX(max_claim_amount, capital+interest) - expectedRepay` | 정수 | 부속서류1, 부속서류2, 10항 clause |
| 6 | **expectedRepay** (채권자별) | 부속서류1 ③ | 담보물건 `market_value × valuation_rate / 100`. 담보물건 없으면 `secured_collateral_value` | Math.round | 부속서류1 |
| 7 | **confirmedUnsecuredCapital** | 변제예정액표 (G)확정채권액 합계 | `SUM(capital)` where `!is_secured && !is_unsettled && !is_other_unconfirmed` | 정수 | 변제예정액표 |
| 8 | **unconfirmedUnsecuredCapital** | 변제예정액표 (I)미확정채권액 합계 | 별제권: `securedDeficiency`. 미확정: `capital`. 합산 | 정수 | 변제예정액표, 7항 |
| 9 | **repaymentDenominatorCapital** | 작성방법 p.12 "3. 변제율" | `confirmedUnsecuredCapital + unconfirmedUnsecuredCapital` | 정수 | 변제율 표시, 변제예정액표 (G)+(I) 총계 |
| 10 | **unsecuredTotal** (D5106 헤더용) | D5106 상단 "무담보 회생채권액" | `totalDebt - securedRehabAmount` | 정수 | D5106 헤더 |
| 11 | **liquidationValue** | D5101 재산목록 청산가치 | `SUM(propertyAmount)` 면제재산 제외, 퇴직금 1/2, 공제 차감 | 정수 | 변제계획안 "청산가치와의 비교" |
| 12 | **livingCostBaseline60** | 보건복지부 고시 기준중위소득 60% | `MEDIAN_INCOME_60[year][householdSize]` 공표 고정값 | 정수 (고정) | 수입지출목록 |
| 13 | **livingCostApplied** | 수입지출목록 Ⅱ | `livingCostBaseline60` (rate=100) 또는 사용자 직접입력 | 정수 | 변제계획안 2항 |
| 14 | **monthlyAvailable** | 변제계획안 2항 (3)가용소득 | `netSalary - livingCostApplied - extraLivingCost - childSupport - trusteeCommission` | Math.floor (작성방법 p.11) | 변제계획안, 변제예정액표 |
| 15 | **monthlyRepay** | 변제예정액표 (E) | `Math.floor(monthlyAvailable)`. D5111이면 `Math.ceil(liquidationValue / repayMonths)` | 올림(ceil) 또는 버림(floor) | 변제예정액표, 별표(1) |
| 16 | **totalRepayAmount** | 변제예정액표 (F)총계 | `monthlyRepay × repayMonths` | 정수 | 변제계획안, 변제예정액표 |
| 17 | **presentValue** | 변제예정액표 (L) | `Math.floor(monthlyRepay × LEIBNIZ_REHAB[repayMonths])` | Math.floor (작성방법 p.12) | 청산가치 비교 |
| 18 | **D5110/D5111** | 작성방법 p.5, 법 §614 | `presentValue > liquidationValue → D5110. else → D5111` | — | 변제계획안 전체 양식 |
| 19 | **repayMonths** | 변제계획안 1항 | 기본 36. 청산가치 미충족+forcedMonths 없으면 48→60 자동연장. 72 이상 절대 불가 | 정수 | 변제계획안 1항, 별표(1) |
| 20 | **repayStartDate** | 변제계획안 1항 | `application.repayment_start_date`. 미설정 시 "변제개시일" 대체 | 날짜 | 변제계획안 1항 |

### 추가 파생값

| 값 | 계산식 | 사용처 |
|---|-------|-------|
| **repayRate** | `Math.round(totalRepayAmount / repaymentDenominatorCapital × 100)` | 변제예정액표 "3. 변제율" |
| **repayEndDate** | `repayStartDate + (repayMonths - 1)개월` | 변제계획안 1항 |
| **trusteeCommission** | `trusteeCommRate > 0 ? Math.round(rawAvailable × rate / 100) : 0` | 변제계획안 3항 |
| **section10Clauses** | 보증채무 → 장래구상채권. is_secured+deficiency>0 → 별제권단축. D5111 → 재산처분승수 | 변제계획안 10항 |
| **snapshotHash** | 핵심 숫자 JSON → djb2 hash | 일관성 검증 |

---

## 2. 이벤트-영향표

| 이벤트 | 바뀌는 값 | 재생성 문서 섹션 | clause 변경 | 재저장 필요 탭 |
|--------|---------|-------------|-----------|------------|
| **별제권부 채권 추가** | securedRehabAmount, securedDeficiency, unsecuredTotal, repaymentDenominatorCapital, repayRate | D5106 헤더+부속서류1, 5항, 6항, 별표(1), 10항 | 별제권단축 추가 | 소득 재저장 |
| **별제권부 채권 삭제** | 동일 역방향 | 동일 | 별제권단축 제거 가능 | 소득 재저장 |
| **담보물건 시가 변경** | expectedRepay, securedDeficiency, securedRehabAmount | 부속서류1, D5106 헤더, 6항, 별표(1), 10항 부족액 | — | 소득 재저장 |
| **보증채무 추가** | — (금액 0) | D5106 채권자 row, 10항 | 장래구상채권 추가 | 채권자 저장 |
| **보증채무 삭제** | — | D5106 row 제거, 10항 | 장래구상채권 제거 | 채권자 저장 |
| **36↔60개월 변경** | repayMonths, repayEndDate, totalRepayAmount, presentValue, D5110/D5111, repayRate | 1항, 6항, 별표(1), 청산가치비교 | — | 변제옵션 저장 |
| **변제개시일 변경** | repayStartDate, repayEndDate | 1항, 별표(1) 날짜 | — | 신청인 저장 |
| **생계비 비율 변경** | livingCostApplied, monthlyAvailable, monthlyRepay, totalRepayAmount, presentValue, repayRate, D5110/D5111 | 2항, 6항, 별표(1), 청산가치비교 | — | 소득 저장 |
| **income_type 변경** | — (숫자 불변) | 5항 "급여/영업" 문구 | — | 소득 저장 |
| **repay_type 변경** | — (현재 미반영) | 향후: 스케줄 분기 | — | 변제옵션 저장 |

---

## 3. 출력 경로 — 단일 snapshotHash 강제

| 산출물 | 원천 | hash 검증 |
|--------|------|----------|
| 미리보기 summary | `buildCaseSnapshot()` (클라이언트) | hash 표시 |
| 채권자목록 PDF | `generateDocument()` → `data._snapshot` (서버) | 서버에서 새 snapshot 생성 |
| 변제계획안 PDF | 동일 | 동일 |
| CSV | `convertToEcourtCSV(rows, snapshotHash)` | hash 메타데이터 포함 |
| D5106 인라인 | 채권자 탭 `d5106Summary` | snapshot과 동일 계산 |

**규칙**: snapshot 없으면 다운로드 비활성화. hash 불일치 시 에러 안내.

---

## 4. 금지사항

1. 사건 특정 결과 숫자의 runtime 코드 하드코딩 금지
2. 사건 특정 결과 숫자의 production DB 직접 UPDATE 금지
3. `as any` 임시 봉합 금지 (타입 불일치는 인터페이스 수정으로 해결)
4. COLAW 숫자를 코드에 상수로 넣기 금지 (tests/docs만 허용)
5. 단일 값에 복수 법률 개념을 겹치기 금지 (예: unsecuredDebt에 D5106 헤더용과 변제율 분모를 동시에 담지 않음)

---

## 5. 완료 기준

1. Golden Case 8유형 전부 diff 0 (또는 법원 기준 허용 차이 입증)
2. DB stale 0
3. CSV snapshotHash 일치
4. UI 게이트 연결 완료
5. 수동 SQL 보정 없이 동일 출력 재현

### Golden Case 8유형

| # | 유형 | 핵심 검증 항목 |
|---|------|-------------|
| 1 | 별제권부 3건 + 부족액 | securedDeficiency, unsecuredTotal, 부속서류1 |
| 2 | 보증채무/장래구상채권 | sub-creditor 행, 10항 clause |
| 3 | D5110 (청산가치 충족) | presentValue > liquidationValue |
| 4 | D5111 (청산가치 미충족) | monthlyRepay 상향, 재산처분 투입 |
| 5 | 36개월 | 기본 기간 |
| 6 | 60개월 | 자동 연장 또는 사용자 선택 |
| 7 | 급여소득 | income_type='salary' |
| 8 | 영업소득 | income_type='business' |
