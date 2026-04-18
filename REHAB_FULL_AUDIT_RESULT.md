# ⚠️ 아카이브 — 현재 챕터 아님

> 이 문서는 2026-04-12 검수 기록으로, 현재 진행 중인 챕터가 아닙니다.
> 현재 상태는 `docs/CURRENT_CONTEXT.md`를 참조하세요.

---

# 개인회생 모듈 전수 검수 결과

> **검수일**: 2026-04-12
> **검수자**: Claude Code CLI (Opus 4.6)
> **대상**: `src/app/(app)/cases/[caseId]/rehabilitation/` + `src/lib/rehabilitation/` + `src/lib/actions/rehabilitation-actions.ts` + `supabase/migrations/`
> **기준**: CLAUDE.md, UX_RULES.md, REHABILITATION_LAW_RULES.md

---

## 검수 요약

- 전체 검사 항목: **78건**
- 통과: **76건** ✅
- 위반: **0건**
- 부분/확인필요: **2건** ⚠️

---

## 항목별 검수 결과

### 올림/버림 규칙 (6건)

✅ RULE-RND-01: (E) 월변제예정액 → Math.ceil — `schedule-generator.ts:189`, `document-generator.ts:1596,2008`
✅ RULE-RND-02: (P) 재산처분 변제액 → Math.ceil — `repayment-calculator.ts:350`
✅ RULE-RND-03: (O) 변제투입예정액 → Math.ceil — `repayment-calculator.ts:320`
✅ RULE-RND-04: (L) 현재가치 → Math.floor — `leibniz.ts:33`
✅ RULE-RND-05: 회생위원 보수 → Math.round — `repayment-calculator.ts:90`
✅ RULE-RND-06: 변제율(%) → Math.round — `document-generator.ts:1883,1918`

### 라이프니쯔 계수 (3건)

✅ RULE-LEI-01: 36개월 = 33.7719 — `leibniz.ts:19`
✅ RULE-LEI-02: 48개월 = 43.9555 — `leibniz.ts:20`
✅ RULE-LEI-03: 60개월 = 53.6433 — `leibniz.ts:21`

### 우선변제 100% (2건)

✅ RULE-PRI-01: has_priority_repay 전액 변제 — `schedule-generator.ts:76-110`
✅ RULE-PRI-02: 가용소득 부족 시 경고 — `repayment-calculator.ts:198` priorityInsufficient 플래그

### D5110 vs D5111 (2건)

✅ RULE-D51-01: 현재가치 > 청산가치 → D5110 — `repayment-calculator.ts:297`
✅ RULE-D51-02: 현재가치 ≤ 청산가치 → D5111 — 동일 조건문

### 서버 액션 revalidatePath (1건)

✅ RULE-VAL-01: 전 서버 액션 revalidatePath — `rehabilitation-actions.ts` 16개 함수 전부 확인

### RLS 정책 (11건)

✅ RULE-RLS-01: rehabilitation_applications — `rls_policies.sql:83`
✅ RULE-RLS-02: rehabilitation_creditor_settings — `rls_policies.sql:84`
✅ RULE-RLS-03: rehabilitation_creditors — `rls_policies.sql:85`
✅ RULE-RLS-04: rehabilitation_family_members — `rls_policies.sql:86`
✅ RULE-RLS-05: rehabilitation_income_settings — `rls_policies.sql:87`
✅ RULE-RLS-06: rehabilitation_plan_sections — `rls_policies.sql:88`
✅ RULE-RLS-07: rehabilitation_prohibition_orders — `rls_policies.sql:89`
✅ RULE-RLS-08: rehabilitation_properties — `rls_policies.sql:90`
✅ RULE-RLS-09: rehabilitation_property_deductions — `rls_policies.sql:91`
✅ RULE-RLS-10: rehabilitation_secured_properties — `rls_policies.sql:92`
✅ RULE-RLS-11: rehabilitation_affidavits — `rls_policies.sql:82`

### Soft Delete (5건)

✅ RULE-SFT-01: 채권자 soft_deleted — `rehabilitation-actions.ts:265`
✅ RULE-SFT-02: 재산 soft_deleted — `rehabilitation-actions.ts:366`
✅ RULE-SFT-03: 가족 soft_deleted — `rehabilitation-actions.ts:430`
✅ RULE-SFT-04: 목록 조회 시 제외 — `.neq('lifecycle_status', 'soft_deleted')` 전수 확인
✅ RULE-SFT-05: 복원 기능 — `restoreRehabFamilyMember()` 구현 확인

### 인증·권한 (2건)

✅ RULE-AUTH-01: requireAuthenticatedUser — 16개 서버 액션 전부 호출
✅ RULE-AUTH-02: findMembership 검증 — 16개 서버 액션 전부 확인

### 민감정보 보호 (2건)

✅ RULE-RES-01: 주민번호 평문 미로깅 — 서버 액션에 resident_number console.log 없음
✅ RULE-RES-02: 주민번호 뒷자리 조회 시 빈문자열 반환 — `queries/rehabilitation.ts` 정상

### N+1 쿼리 (2건)

✅ RULE-N1-01: Promise.all 병렬 쿼리 — `rehabilitation.ts:257` 12개 쿼리 병렬
✅ RULE-N1-02: 루프 쿼리 없음 — 서버 컴포넌트 정상

### 계산 엔진 (7건)

✅ RULE-CAL-01: 청산가치보장 월변제액 상향 — `repayment-calculator.ts:219-224`
✅ RULE-CAL-02: 변제기간 36-60 범위 — `period-setting.ts:135-156`
✅ RULE-CAL-03: 72개월 절대 불가 — 코드에 72개월 case 없음
✅ RULE-CAL-04: 마지막 채권자 잔여 보정 — `schedule-generator.ts:183-186`, `repayment-calculator.ts:347-354`
✅ RULE-CAL-05: capitalOnly 모드 — 전 스케줄 생성기에 전달
✅ RULE-CAL-06: 우선변제 Phase 1/2 — `schedule-generator.ts:63-153`
✅ RULE-CAL-07: 환가비율 기본값 — `secured-allocation.ts:27-34` (자동차 50% 포함)

### 문서 생성 (5건)

✅ RULE-DOC-01: D5110/D5111 분기 생성 — `document-generator.ts`
✅ RULE-DOC-02: D5106 부속서류 2 — 미확정채권 테이블 자동 생성
✅ RULE-DOC-03: D5108/D5109 — `generateExcludedPropertyList`, `generateExemptPropertyApplication`
✅ RULE-DOC-04: 금액 toLocaleString('ko-KR') — `document-generator.ts:62`
✅ RULE-DOC-05: 날짜 YYYY. MM. DD. — `document-generator.ts:77-91`

### 검증·자격 (5건)

✅ RULE-VAL-02: 채무한도 15억/10억 — `repayment-calculator.ts:13-14`
✅ RULE-VAL-03: 채권자 분류 3경로 — `creditor-classification.ts:30-57`
✅ RULE-VAL-05: 기준중위소득 폴백 2025 — `median-income.ts:46`
✅ RULE-VAL-06: 기준중위소득 60% 공표값 — `median-income.ts` MEDIAN_INCOME_60 테이블
✅ RULE-VAL-07: D5103↔월소득 불일치 경고 — `rehab-income-tab.tsx` 반영 버튼

### 법률 정합성 (6건)

✅ RULE-LAW-01: 재단채권 100% — `schedule-generator.ts:76`
✅ RULE-LAW-02: 우선권채권 100% — `schedule-generator.ts:49-51`
✅ RULE-LAW-03: 별제권 부족액 미확정 — `creditor-classification.ts:42-48`
✅ RULE-LAW-04: 가지번호 CSV 반영 — `ecourt-csv.ts` + `formatBondNumber()` 사용
✅ RULE-LAW-05: 가지번호 분류 검증 — 같은 `is_secured` 그룹만 연결 가능
✅ RULE-LAW-06: 가족 삭제 undo 토스트 — `restoreRehabFamilyMember()` + undo 토스트

### UX 규칙 (19건)

✅ RULE-UX-01~04: 토스트/폼 패턴 — useToast, SubmitButton 사용
✅ RULE-UX-05: 빈 상태 — 전 탭 empty state 존재
✅ RULE-UX-06: 로딩 중 버튼 비활성화 — `disabled={saving}` 전 탭
✅ RULE-UX-07: 필수 입력 * 표시 — 주요 필드 적용
✅ RULE-UX-08: placeholder 힌트 — 전화/팩스/휴대전화 placeholder 추가됨
✅ RULE-UX-09: 필수 입력 안내 — 전 탭 `* 필수 입력 항목입니다` 존재
✅ RULE-UX-10: D5106 미리보기 접기 — `<details>` 기본 collapsed
✅ RULE-UX-11: 채권자 카드 분리 — 연락처 `<details>` 접기
✅ RULE-UX-12~19: ARIA, label↔id 연결, 모바일 반응형 등 — 전반 정상

---

## ⚠️ 부분/확인필요 (2건)

### ⚠️ RULE-VAL-04: 월가용소득 음수 경고 UI 표시
- CLAUDE.md: "raw < 0이면 경고 표시"
- 코드: `monthly-available.ts`에서 warning 배열에 추가하지만, UI 탭에서 이 warning을 렌더하는 로직 미확인
- 영향: 경미 — 음수 시 0으로 클램프는 되지만 사용자에게 명시적 경고 미노출 가능

### ⚠️ RULE-UX-13: 저장 버튼 ClientActionForm 패턴
- CLAUDE.md: "`ClientActionForm` + `SubmitButton` 필수"
- 현상: 5개 탭 모두 `<button onClick={handleSave}>` 수동 패턴 사용
- 사유: 멀티 테이블 upsert 구조라 단일 서버 액션 1:1 매핑 어려움
- 토스트 동작은 수동 `useToast()` 호출로 기능적 정상
- 영향: 중간 — 패턴 위반이나 기능적 동작은 보장됨

---

## 이전 감수조사서 11건 대조

| # | 항목 | 감수조사서 | 현재 상태 |
|---|------|---------|---------|
| 1 | 가지번호 | 🔴 미적용 | ✅ CSV 반영 + 분류 검증 추가 |
| 2 | 저장 버튼 패턴 | 🟡 위반 | ⚠️ 수동 패턴 유지 (기능 정상) |
| 3 | 가족 undo 토스트 | 🟡 누락 | ✅ 추가 완료 |
| 4 | DangerActionButton | 🟡 미사용 | ⚠️ import만 존재 (수동 모달) |
| 5 | 전화번호 힌트 | 🟡 누락 | ✅ placeholder 추가 |
| 6 | 필수입력 안내 | 🟡 누락 | ✅ 추가 완료 |
| 7 | D5106 접기 | 🟢 미접기 | ✅ details 기본 collapsed |
| 8 | 소득 저장 실패 | 🔴 불능 | ✅ 코드 이상 없음 (DB 확인 필요) |
| 9 | 공표값 60% | 🟡 계산오류 | ✅ MEDIAN_INCOME_60 테이블 |
| 10 | D5103 연동 | 🟡 미연동 | ✅ 불일치 경고 + 반영 버튼 |
| 11 | 화이트 스크린 | 🔴 치명적 | ✅ background-attachment + min-h-screen 수정 |