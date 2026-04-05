# Vein Spiral 개인회생/파산 구현 종합 보고서

> 작성일: 2026-04-05
> 대상: 다음 파일럿 개발자, 운영팀
> 목적: 현재 구현 상태, 핵심 로직, 주의사항, 잔여 작업을 명확히 전달

---

## 1. 전체 아키텍처 개요

### 1.1 기술 스택
- **프레임워크**: Next.js 16 App Router + React 19 + TypeScript strict
- **DB**: Supabase (PostgreSQL + RLS + Auth)
- **스타일링**: Tailwind v4
- **문서 출력**: 서버사이드 HTML 생성 → iframe 프리뷰 → 브라우저 인쇄(PDF)

### 1.2 핵심 경로

```
사건 생성 → 개인회생/파산 모듈 데이터 입력 → 문서 자동 생성 → 법원 제출
```

### 1.3 디렉토리 구조

```
src/
├── app/(app)/cases/[caseId]/
│   ├── rehabilitation/          ← 개인회생 페이지
│   │   ├── tabs/
│   │   │   ├── rehab-application-tab.tsx    ← 신청인 정보 입력
│   │   │   ├── rehab-creditors-tab.tsx      ← 채권자 목록
│   │   │   ├── rehab-properties-tab.tsx     ← 재산 목록
│   │   │   ├── rehab-income-tab.tsx         ← 수입/지출/변제기간
│   │   │   ├── rehab-affidavit-tab.tsx      ← 진술서
│   │   │   ├── rehab-plan-tab.tsx           ← 변제계획안 10항
│   │   │   └── rehab-documents-tab.tsx      ← 문서 출력 UI ★
│   │   └── page.tsx
│   └── bankruptcy/              ← 개인파산 페이지
│       ├── tabs/
│       │   └── bankruptcy-documents-tab.tsx  ← 파산 문서 출력
│       └── page.tsx
├── lib/
│   ├── rehabilitation/
│   │   └── document-generator.ts    ← 개인회생 문서 생성 엔진 ★★★
│   ├── bankruptcy/
│   │   └── document-generator.ts    ← 개인파산 문서 생성 엔진
│   ├── actions/
│   │   ├── rehabilitation-actions.ts ← 개인회생 서버 액션
│   │   └── bankruptcy-document-actions.ts ← 파산 서버 액션
│   └── queries/
│       └── rehabilitation.ts         ← DB 데이터 조회
scripts/
└── colaw-migration/
    ├── migrate-colaw-to-vs.ts       ← colaw → VS 마이그레이션 스크립트
    └── README.md
```

---

## 2. DB 스키마 (핵심 테이블)

### 2.1 개인회생 테이블

| 테이블 | 용도 | 비고 |
|--------|------|------|
| `cases` | 사건 기본 정보 | court_name, case_number 포함 |
| `rehabilitation_applications` | 신청인/대리인 정보 | 1 사건당 1행 |
| `rehabilitation_creditors` | 채권자 목록 | 사건당 N행, soft_delete |
| `rehabilitation_creditor_settings` | 채권자 설정 (변제 방식) | 1 사건당 1행 |
| `rehabilitation_properties` | 재산 목록 | 사건당 N행, soft_delete |
| `rehabilitation_property_deductions` | 재산 공제 | 사건당 N행 |
| `rehabilitation_family_members` | 가족관계 | 사건당 N행, soft_delete |
| `rehabilitation_income_settings` | 수입/지출/변제기간 | 1 사건당 1행 |
| `rehabilitation_affidavits` | 진술서 | 1 사건당 1행 |
| `rehabilitation_plan_sections` | 변제계획안 10항 | 사건당 N행 |

### 2.2 개인파산 테이블

| 테이블 | 용도 | 비고 |
|--------|------|------|
| `cases` | 사건 기본 정보 | insolvency_subtype = 'individual_bankruptcy' |
| `rehabilitation_applications` | 신청인/대리인 (회생과 공유) | |
| `insolvency_creditors` | 파산 채권자 | 회생과 별도 테이블! |
| `rehabilitation_properties` | 재산 목록 (회생과 공유) | |
| `rehabilitation_income_settings` | 수입/지출 (회생과 공유) | |
| `rehabilitation_affidavits` | 진술서 (회생과 공유) | |

### 2.3 핵심 주의사항 — 테이블 분리

> **파산 채권자는 `insolvency_creditors`, 회생 채권자는 `rehabilitation_creditors`**
> 이 두 테이블은 컬럼 구조가 다름. 혼동하면 안 됨.
>
> **신청인/재산/수입지출/진술서는 회생/파산이 공유** (`rehabilitation_*` 테이블 재사용)

---

## 3. 문서 생성 시스템

### 3.1 개인회생 문서 타입 (11종)

| 문서 타입 키 | 문서명 | 필수 여부 | 구현 상태 |
|-------------|--------|----------|----------|
| `application` | 개인회생 신청서 | 필수 | ✅ 완료 |
| `delegation` | 위임장 (개인 변호사/법무사) | 필수 | ✅ 완료 |
| `delegation_with_attorney` | 위임장 + 담당변호사지정서 (법무법인) | 필수 (법무법인 시) | ✅ 완료 |
| `attorney_designation` | 담당변호사지정서 (단독) | 선택 | ✅ 완료 |
| `prohibition_order` | 금지명령신청서 | 필수 (개시신청 시 항상) | ✅ 완료 |
| `stay_order` | 중지명령신청서 | 조건부 (강제집행 중지 필요 시) | ✅ 완료 |
| `creditor_list` | 채권자 목록 | 필수 | ✅ 완료 |
| `property_list` | 재산 목록 | 필수 | ✅ 완료 |
| `income_statement` | 수입 및 지출에 관한 목록 | 필수 | ✅ 완료 |
| `affidavit` | 진술서 | 필수 | ✅ 완료 |
| `repayment_plan` | 변제계획안 | 필수 | ✅ 완료 |

### 3.2 개인파산 문서 타입 (6종)

| 문서 타입 키 | 문서명 | 구현 상태 |
|-------------|--------|----------|
| `petition` | 파산·면책 신청서 | ✅ 완료 |
| `delegation` | 위임장 | ✅ 완료 |
| `creditor_list` | 채권자 목록 | ✅ 완료 |
| `property_list` | 재산 목록 | ✅ 완료 |
| `income_statement` | 수입 및 지출에 관한 목록 | ✅ 완료 |
| `affidavit` | 진술서 | ✅ 완료 |

### 3.3 문서 생성 흐름

```
1. 사용자가 "미리보기" 클릭
2. 클라이언트 → 서버 액션 호출 (generateRehabDocument)
3. 서버: 인증 확인 → 병렬 DB 조회 → cases 테이블에서 법원명/사건번호 병합
4. document-generator.ts의 generateDocument() 호출
5. HTML 문자열 반환 → 클라이언트 iframe에 srcDoc로 렌더링
6. 사용자가 "인쇄" → 브라우저 인쇄 다이얼로그 → PDF 저장
```

### 3.4 핵심 로직 상세

#### 사건번호 연동 (P0 버그 수정 완료)
- 사건번호/법원명은 `cases` 테이블에 저장 (rehabilitation_applications가 아님)
- 서버 액션에서 cases 테이블을 별도 조회하여 application 데이터에 병합
- **이것을 빠뜨리면 모든 문서의 사건번호가 공란으로 나옴**

```typescript
// rehabilitation-actions.ts 핵심 로직
const [moduleData, caseResult] = await Promise.all([
  getRehabModuleData(caseId),
  supabase.from('cases').select('court_name, case_number, title').eq('id', caseId).maybeSingle(),
]);
const mergedApplication = {
  ...(moduleData.application ?? {}),
  ...(caseInfo?.court_name ? { court_name: caseInfo.court_name } : {}),
  ...(caseInfo?.case_number ? { case_number: caseInfo.case_number } : {}),
};
```

#### 위임장 — 법무법인 vs 개인 변호사
- 개인 변호사/법무사 → `delegation` (단순 위임장)
- 법무법인 → `delegation_with_attorney` (위임장 + 담당변호사지정서 통합)
- 법무법인인 경우 필요 필드: `agent_law_firm`, `representative_lawyer`, `agent_name`(담당변호사)

#### 금지명령신청서 (prohibition_order)
- **개인회생 신청 시 반드시 함께 제출**
- 법적 근거: 채무자 회생 및 파산에 관한 법률 제593조 제1항
- 채권자 수와 총채무액을 자동으로 채움
- 신청취지: "강제집행·가압류·가처분을 금지한다"

#### 중지명령신청서 (stay_order)
- **진행 중인 강제집행이 있을 때만 사용**
- 법적 근거: 채무자 회생 및 파산에 관한 법률 제593조 제3항
- 금지명령과 달리 선택적 제출

#### 금액 계산 로직
- 총채무액 = Σ(원금 + 이자) (모든 채권자)
- 담보채무/무담보채무는 별도 합산
- 변제 가능 금액 = 순수입 - 생활비 - 추가생활비 - 양육비
- 변제 총액 = 변제 가능 금액 × 변제기간(개월)

---

## 4. colaw 마이그레이션

### 4.1 현황

| 항목 | 수치 |
|------|------|
| 총 마이그레이션 대상 | 90건 |
| VS에 등록된 사건 | 91건 (중복 포함) |
| 중복 사건 (동명 이인) | 6쌍 (이옥주, 김한경, 임경애, 김기홍, 계승일, 조두성) |
| 금액 완전 일치 | **4건** |
| 금액 불일치 (채권자 누락) | **48건** |
| 금액 불일치 (총채무 오류) | **6건** |
| 수입데이터 미추출 (totalDebt=0) | **30건** |
| 데이터 없음 | **3건** (문연자, 박복희, 김영희 신청 건) |

### 4.2 마이그레이션 스크립트 버그 — 원인 분석

#### 버그 1: 채권자 추출 실패 (48건)
**원인**: `sel.value = String(idx)` — colaw의 select option value는 순차 정수가 아니라 채권자 seq ID. 또한 `new Event('change')`가 jQuery 이벤트 핸들러를 트리거하지 못함.

**수정**: `sel.selectedIndex = idx` + jQuery `.trigger('change')` 사용. AJAX 대기 시간 500ms → 1500ms 증가.

#### 버그 2: 수입지출 탭 데이터 미추출 (30건)
**원인**: 탭 클릭 후 AJAX 로딩 대기 부족 (2초). colaw는 탭 전환 시 서버에서 데이터를 비동기 로드하는데, 네트워크 지연 시 2초로 부족.

**수정**: 대기 시간 3초로 증가. 탭 클릭 로직 강화 (정확한 탭 선택 + fallback 인덱스 방식).

#### 버그 3: 총채무 합계 불일치 (6건)
**원인**: 채권자 탭과 수입지출 탭의 합계 필드가 다른 시점에 추출됨. 채권자 추가/수정 후 합계가 갱신되지 않은 상태에서 추출된 가능성.

**수정**: 수입지출 탭에서도 합계를 추출하여 대체값으로 사용.

### 4.3 수정된 스크립트 주요 변경점

```typescript
// 변경 전 (버그)
sel.value = String(idx);
sel.dispatchEvent(new Event('change'));
await delay(500);

// 변경 후 (수정)
sel.selectedIndex = idx;
if (typeof jQuery !== 'undefined') {
  jQuery(sel).trigger('change');
} else {
  sel.dispatchEvent(new Event('change', { bubbles: true }));
}
await delay(1500);
```

### 4.4 재마이그레이션 방법

수정된 스크립트에 `reExtractCase()` 함수가 추가됨. 기존 사건의 채권자 데이터를 soft delete 후 새로 추출하여 삽입.

```bash
# 재마이그레이션 실행
MIGRATION_MODE=reextract \
RE_EXTRACT_MAP='{"vs_case_id":"colaw_case_n", ...}' \
npx tsx scripts/colaw-migration/migrate-colaw-to-vs.ts
```

### 4.5 colaw → VS 필드 매핑 (핵심)

| colaw 필드 | VS DB 컬럼 | 변환 로직 |
|-----------|-----------|----------|
| applicationname | applicant_name | 그대로 |
| applicationjumin | resident_number_front + _hash | "-" 기준 분리 |
| incomegubun | income_type | '1'→'salary', '2'→'business' |
| agentgubun | agent_type | '1'→'법무사', '2'→'변호사' |
| capital (쉼표 구분) | capital (bigint) | parseAmount: 쉼표 제거 → parseInt |
| interest (쉼표 구분) | interest (bigint) | 동일 |
| nowtotalsum | total_debt | 동일 |

---

## 5. 이전 세션에서 해결된 P0 버그들

### 5.1 인증 세션 만료 (미들웨어)
- **증상**: 로그인 후 시간이 지나면 인증 오류
- **원인**: `middleware.ts`에서 `updateSession()`이 호출되지 않음
- **수정**: `return await updateSession(request);` 추가

### 5.2 알림센터 카운트 불일치
- **증상**: 사이드바와 알림센터의 "검토필요" 건수가 다름
- **원인**: 알림센터 쿼리에 `trashed_at IS NULL` 필터 누락
- **수정**: `.is('trashed_at', null)` 추가 + navCounts 사용

### 5.3 문서 사건번호 공란
- **증상**: 모든 문서에서 사건번호가 비어있음
- **원인**: 사건번호가 `cases` 테이블에 있는데, 문서 생성 시 `rehabilitation_applications`만 조회
- **수정**: 서버 액션에서 cases 테이블 병렬 조회 후 데이터 병합

### 5.4 위임장 정보 부족
- **증상**: 위임장에 위임인/수임인 구분 없음, 위임사항 누락
- **수정**: 완전한 위임장 양식으로 재작성 (위임인 테이블 + 수임인 테이블 + 위임사항 5항목)

### 5.5 변제계획안 연도 하드코딩
- **증상**: 변제계획안에 "2025년" 하드코딩
- **수정**: `new Date().getFullYear()` 동적 생성

---

## 6. 절대 하면 안 되는 것 (Anti-patterns)

### 6.1 코드 규칙
1. **Hard delete 금지**: `.delete()` 대신 `lifecycle_status: 'soft_deleted'` 사용
2. **`button.tsx`에 'use client' 추가 금지**: 서버 컴포넌트가 `buttonStyles()` 직접 호출
3. **window.confirm/alert 금지**: `DangerActionButton` 사용
4. **`<form action={}>` 금지**: `ClientActionForm` + `SubmitButton` 사용
5. **주민번호/계좌번호 로그 기록 금지**

### 6.2 문서 생성 시
1. **cases 테이블 조회 빠뜨리지 말 것**: 사건번호/법원명은 cases에 있음
2. **채권자 테이블 혼동 주의**: 회생은 `rehabilitation_creditors`, 파산은 `insolvency_creditors`
3. **금액 포맷팅 시 원단위**: `formatAmount()`는 "원" 포함, `formatAmountNoUnit()`은 미포함
4. **날짜 포맷**: `formatDate()`는 "YYYY. MM. DD." 형식 (점 뒤 공백 주의)

### 6.3 마이그레이션 시
1. **select option value를 순차 정수로 가정하지 말 것**: `selectedIndex` 사용
2. **AJAX 대기 시간 충분히 줄 것**: 최소 1.5초, 수입지출 탭은 3초
3. **jQuery 이벤트 트리거 필수**: colaw는 jQuery 기반, native Event만으로 부족
4. **빈 채권자(placeholder) 스킵**: creditor_name이 비어있으면 건너뛰기

---

## 7. 잔여 작업 (TODO)

### 7.1 긴급 (데이터 정합성)
- [ ] **54건 채권자 데이터 재추출**: 수정된 마이그레이션 스크립트로 재실행 필요
- [ ] **30건 수입지출 데이터 재추출**: 동일
- [ ] **3건 데이터 없는 사건 확인**: 문연자, 박복희, 김영희 — colaw에서 수동 확인 필요
- [ ] **6쌍 중복 사건 정리**: 이옥주, 김한경, 임경애, 김기홍, 계승일, 조두성 — 최신 건만 유지

### 7.2 기능 보완
- [ ] **대표변호사 필드 추가**: `rehabilitation_applications`에 `representative_lawyer` 컬럼 추가 필요
- [ ] **금지명령/중지명령 상태 관리**: 신청 여부를 DB에 기록하는 컬럼 필요
- [ ] **파산 문서에도 법무법인 위임장 적용**: 현재 회생만 구현

### 7.3 UX 개선
- [ ] **문서 출력 시 로딩 상태 표시 개선**: 대용량 채권자 문서 생성 시 시간 소요
- [ ] **문서 미리보기 확대/축소 기능**
- [ ] **일괄 다운로드 기능**: 모든 문서 한번에 다운로드

---

## 8. 법률 용어 사전

| 용어 | 영문 | 설명 |
|------|------|------|
| 개인회생 | Individual Rehabilitation | 정기적 소득이 있는 채무자의 채무 조정 절차 |
| 개인파산 | Individual Bankruptcy | 소득이 없거나 변제 능력이 없는 채무자의 절차 |
| 금지명령 | Prohibition Order | 개시결정 전까지 강제집행 등을 금지 (제593조 제1항) |
| 중지명령 | Stay Order | 진행 중인 강제집행의 중지 (제593조 제3항) |
| 변제계획안 | Repayment Plan | 채무자가 제출하는 변제 일정 및 금액 계획 |
| 별제권 | Separate Satisfaction Right | 담보물에 대한 우선 변제권 |
| 청산가치 | Liquidation Value | 파산 시 채권자가 받을 수 있는 금액 |
| 위임장 | Power of Attorney | 대리인 선임 문서 |
| 담당변호사지정서 | Attorney Designation | 법무법인이 담당변호사를 지정하는 문서 |

---

## 9. 환경 설정 정보

| 항목 | 값 |
|------|-----|
| Supabase URL | `https://hyfdebinoirtluwpfmqx.supabase.co` |
| 조직 ID (법무법인 서해) | `6b83d234-897e-43ef-8cf8-c7c7cf0a9f39` |
| 사건 유형 (회생) | `insolvency_subtype = 'individual_rehabilitation'` |
| 사건 유형 (파산) | `insolvency_subtype = 'individual_bankruptcy'` |
| 문서 생성기 위치 | `src/lib/rehabilitation/document-generator.ts` |
| 파산 문서 생성기 위치 | `src/lib/bankruptcy/document-generator.ts` |
| 마이그레이션 스크립트 | `scripts/colaw-migration/migrate-colaw-to-vs.ts` |

---

## 10. 파일 변경 이력 (최근 세션)

| 파일 | 변경 내용 |
|------|----------|
| `middleware.ts` | updateSession() 호출 추가 (인증 세션 유지) |
| `src/lib/supabase/middleware.ts` | (변경 없음 — 이미 올바르게 구현) |
| `src/app/(app)/notifications/page.tsx` | 카운트 불일치 수정 |
| `src/lib/queries/notifications.ts` | trashed_at IS NULL 필터 추가 |
| `src/lib/rehabilitation/document-generator.ts` | 문서 타입 4종 추가 (위임장+지정서, 지정서, 금지명령, 중지명령), 기존 위임장/신청서/변제계획안 수정 |
| `src/lib/actions/rehabilitation-actions.ts` | cases 테이블 병합 로직 추가 |
| `src/lib/actions/bankruptcy-document-actions.ts` | cases 테이블 병합 로직 추가 |
| `src/app/(app)/cases/[caseId]/rehabilitation/tabs/rehab-documents-tab.tsx` | 문서 타입 11종으로 확장, 그룹 헤더 UI |
| `scripts/colaw-migration/migrate-colaw-to-vs.ts` | 채권자 추출 버그 수정, 수입지출 추출 개선, 재마이그레이션 기능 추가 |

---

*이 보고서는 개인회생/파산 모듈의 전체 구현 상태를 문서화합니다. 다음 파일럿은 이 보고서를 참고하여 잔여 작업을 이어가세요.*
