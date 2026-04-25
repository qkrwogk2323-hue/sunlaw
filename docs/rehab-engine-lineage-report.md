# 개인회생 엔진 산수 계보도 + 선택값 변화표 + 문서 영향표

> 작성일: 2026-04-25
> 목적: 코드 수정 전 현재 상태 문서화. "전체적으로 맞습니다" 금지. 표와 실제 값으로만 보고.

---

## 1. 산수 계보도 — 18개 값의 전체 경로

| # | 값 | UI 입력 | 서버 액션 매핑 | DB 컬럼 | 서버 계산식 | Doc-Gen 읽기 | 문서 위치 |
|---|---|--------|-------------|---------|-----------|------------|---------|
| 1 | total_debt | 채권자 합산 | upsertRehabIncomeSettings L622 | income_settings.total_debt | sum(capital+interest) | ❌ DB 안 읽음. 재계산: unsecuredDenom(원금만) | 변제계획안 6항 분모 |
| 2 | total_capital | 채권자 합산 | 동일 L607 | income_settings.total_capital | sum(capital) | ❌ DB 안 읽음. 재계산 | 변제계획안 3항 |
| 3 | total_interest | 채권자 합산 | 동일 L607 | income_settings.total_interest | sum(interest) | ❌ DB 안 읽음. 재계산 | 변제계획안 3항 |
| 4 | secured_debt | 채권자 합산 | 동일 L617 | income_settings.secured_debt | sum(min(collateral, claim)) | ❌ DB 안 읽음. 미사용 | 문서에 미출력 |
| 5 | unsecured_debt | 파생 | 동일 L627 | income_settings.unsecured_debt | totalDebt - securedDebt | ❌ DB 안 읽음. unsecuredDenom으로 재계산 | 6항 분모 |
| 6 | gross_salary | monthly_income | mapIncomeFormToDb L546 | income_settings.gross_salary | = monthly_income | ❌ 미사용 | 미출력 |
| 7 | net_salary | monthly_income | L545 | income_settings.net_salary | = monthly_income | ✅ L1508 | 수입지출 연간환산 |
| 8 | monthly_available | 소득탭 계산 | L636 서버 재계산 | income_settings.monthly_available | net - living - extra - child - trustee | ❌ DB 안 읽음. computeMonthlyAvailable() 재계산 | 변제계획안 2항 "가용소득" |
| 9 | liquidation_value | 재산탭 계산 | L647 서버 재계산 | income_settings.liquidation_value | 면제 제외, 퇴직금 1/2 | ❌ DB 안 읽음. **단순 합산으로 재계산 (다른 공식!)** | 변제계획안 "청산가치" |
| 10 | monthly_repay | 변제계획탭 계산 | L567 | income_settings.monthly_repay | calculateRepayment() 결과 | ❌ DB 안 읽음. **단순 공식으로 재계산 (다른 공식!)** | 변제계획안 2항, 요약표 |
| 11 | total_repay_amount | 변제계획탭 계산 | L568 | income_settings.total_repay_amount | monthlyRepay × months + dispose | ❌ DB 안 읽음. **dispose 미포함으로 재계산 (다른 공식!)** | 변제계획안 총변제액 |
| 12 | repay_rate | 변제계획탭 계산 | L569 | income_settings.repay_rate | total/unsecuredCapital × 100 | ❌ DB 안 읽음. **Math.round 재계산 (다른 정밀도!)** | 변제계획안 변제율 |
| 13 | trustee_name | 소득탭 입력 | L573 | income_settings.trustee_name | 직접 저장 | ❌ 미사용 | **문서에 미출력 (dead)** |
| 14 | trustee_account | 소득탭 입력 | L574 | income_settings.trustee_account | 직접 저장 | ❌ 미사용 | **문서에 미출력 (dead)** |
| 15 | liquidation_guaranteed | 변제계획탭 계산 | 저장 | income_settings.liquidation_guaranteed | presentValue > liquidationValue | ❌ DB 안 읽음. basePresentValue <= liqValueCalc으로 재계산 | D5110/D5111 판정 |
| 16 | repayment_start_date | 신청인탭 입력 | mapApplicationFormToDb L57 | applications.repayment_start_date | 직접 저장 | ✅ L1584 | 변제계획안 1항 기간 |
| 17 | repay_type | 변제계획탭 선택 | L575 | income_settings.repay_type | 직접 저장 | ❌ **완전 무시** | 미반영 (항상 pro-rata) |
| 18 | period_setting | 변제계획탭 파생 | L577 | income_settings.period_setting | repayOption → 숫자 매핑 | ✅ L1557 → decidePeriodSetting() | 변제기간 결정 |

### 핵심 DISCONNECT 7건

| # | 값 | 불일치 내용 |
|---|---|-----------|
| D1 | liquidation_value | 서버: 면제 제외+퇴직금 1/2. Doc-gen: **단순 합산-공제** → 면제재산이 있으면 값이 완전히 다름. "3원 vs 1.4B" 원인 |
| D2 | monthly_repay | Plan탭: calculateRepayment() (priority, dispose, option 반영). Doc-gen: **ceil(liq/months) 또는 floor(available)** → 5항과 6항 숫자 불일치 |
| D3 | total_repay_amount | Plan탭: monthlyRepay×months+dispose. Doc-gen: effectiveMonthlyRepay×months **(dispose 미포함)** |
| D4 | totalDebt 정의 | 서버: capital+interest. Doc-gen: **unsecured capital only** → 안분 분모 불일치 |
| D5 | repay_rate 정밀도 | Plan탭: float. Doc-gen: **Math.round (정수)** |
| D6 | repay_type | 저장되지만 Doc-gen에서 **완전 무시** |
| D7 | trustee_name/account | 저장되지만 Doc-gen에서 **미출력** |

---

## 2. 선택값 변화표

| 이벤트 | 바뀌는 DB 값 | 바뀌는 snapshot | 재생성 문서 섹션 | 사라지는 clause | 재저장 필요 탭 |
|--------|-------------|---------------|--------------|--------------|-------------|
| 별제권부 채권 추가 | secured_debt, unsecured_debt | creditor_summary, secured_attachment | D5106 헤더, 부속서류1, 5항, 6항, 별표(1), 10항 | — | 소득 재저장 |
| 별제권부 채권 삭제 | secured_debt, unsecured_debt | 동일 | D5106 헤더, 부속서류1, 5항, 6항, 별표(1), 10항 | 별제권부 단축 clause 제거 가능 | 소득 재저장 |
| 담보물 환가가치 변경 | secured_debt, unsecured_debt | secured_attachment | 부속서류1, D5106 헤더, 6항, 별표(1), 10항 부족액 | — | 소득 재저장 |
| 보증채무 추가 | — | creditor_summary | D5106 채권자 row, 10항 장래구상채권 clause | — | 채권자 저장 |
| 보증채무 삭제 | — | creditor_summary | D5106 채권자 row 제거, 10항 clause | 장래구상채권 clause 제거 | 채권자 저장 |
| income_type 변경 | income_type | income_summary | 수입지출목록, 변제계획안 5항 "급여/영업" | — | 소득 저장 |
| repay_type 변경 | repay_type | repayment_summary | **현재: 미반영 (D6)** | — | 변제계획 저장 |
| 36↔60개월 변경 | repay_months, period_setting | repayment_summary | 1항 기간, 6항, 별표(1), 총변제액, 변제율 | — | 변제계획 저장 |
| 변제개시일 변경 | repayment_start_date | plan | 1항 기간, 별표(1) 날짜 | — | 신청인 저장 |
| liquidation_guaranteed on/off | liquidation_guaranteed | plan | D5110↔D5111 전환, 2항 "나.재산", 5항, 9항 | D5111 처분 문구 추가/제거 | 변제계획 저장 |

---

## 3. 문서 영향표

| 문서 | 원천 | 사용 필드 | 계산 함수 | 수동입력 | stale 위험 |
|------|------|----------|---------|---------|-----------|
| 개시신청서 | application | applicant_name, court_name, case_number, repayment_start_date, total_repay_amount, monthly_repay | generateApplication | ✅ 대부분 | 변제계획 변경 시 총변제액 stale |
| D5106 상단 | creditors, **creditor-list-engine** | securedTotal, unsecuredTotal | buildCreditorListOutput | ❌ | **부속서류1과 다른 엔진 사용 (D1)** |
| 부속서류 1 | creditors, securedProperties | max_claim_amount, capital, interest | **generateSecuredCreditorTable** | ❌ | 헤더와 다른 계산 |
| 재산목록 | properties, deductions | amount, category, structured_detail | generatePropertyList | ❌ | structured_detail 미반영 시 |
| 수입지출목록 | incomeSettings, familyMembers | net_salary, income_breakdown, living_cost | generateIncomeStatement | ❌ | income_breakdown stale |
| 진술서 | affidavit | debt_history, income_change 등 | generateAffidavit | ✅ | 없음 |
| 변제계획안 1~9항 | snapshot → **buildPlanCoreSections** | 전체 snapshot | buildPlanCoreSections | ❌ 자동 | snapshot 통일 시 해결 |
| 변제계획안 10항 | creditors → **buildSection10Clauses** | bond_type, is_secured, deficiency | buildSection10Clauses | addendum만 | deficiency 산식 불일치 (D2) |
| 별표(1) | creditors, schedule | effectiveMonthlyRepay, unsecuredDenom | document-generator 내부 | ❌ | **5항과 다른 값 사용 (D2)** |

---

## 4. 자동생성 원칙표

| 항목 | 자동 생성 | 사용자 편집 | 현재 상태 |
|------|----------|-----------|---------|
| 제1항 변제기간 | ✅ buildPlanCoreSections | ❌ | ✅ 전환 완료 |
| 제2항 변제방법 | ✅ | ❌ | ✅ |
| 제3항 변제율 | ✅ | ❌ | ✅ |
| 제4항 채권자별 | ✅ | ❌ | ✅ |
| 제5항 조달방법 | ✅ | ❌ | ✅ (단, doc-gen 5항 표는 별도 계산 → D2) |
| 제6항 부인채권 | ✅ | ❌ | ✅ |
| 제7항 면책 | ✅ | ❌ | ✅ |
| 제8항 특별조항 | ✅ | ❌ | ✅ |
| 제9항 처분방법 | ✅ | ❌ | ✅ |
| 제10항 기타사항 | ✅ clause engine | ✅ addendum만 | ✅ 전환 완료 |

**원칙**: 1항~9항은 자동 생성. 10항은 clause engine + manual addendum. textarea 자유서술 금지.

---

## 5. 즉시 수정이 필요한 DISCONNECT 우선순위

| 순서 | DISCONNECT | 영향 | 수정 방향 |
|------|-----------|------|---------|
| 1 | D1: liquidation_value | "3원 vs 1.4B". 청산가치 틀림 → D5111 판정·월변제액·변제율 전부 틀림 | doc-gen이 calculateLiquidationValue() 사용 또는 DB 값 읽기 |
| 2 | D2: monthly_repay | 5항과 6항/별표(1) 숫자 불일치 | doc-gen이 calculateRepayment() 결과 사용 |
| 3 | D4: totalDebt 정의 | 안분 분모 불일치 | doc-gen이 unsecuredCapital (getDebtSummary) 사용 |
| 4 | D3: total_repay_amount | dispose 미포함 | 수식 통일 |
| 5 | D6: repay_type 무시 | 선택해도 문서 미반영 | schedule generator 연동 |
| 6 | D7: trustee 미출력 | 저장만 되고 문서에 안 나옴 | 8항에 출력 |
| 7 | D5: repay_rate 정밀도 | 소수점 차이 | 통일 |
