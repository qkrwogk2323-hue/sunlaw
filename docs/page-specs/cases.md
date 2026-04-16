# Page Spec: Cases List (`/cases`)

> 작성: 2026-04-16
> 지위: 조직 내 사건 목록 + 허브 연결 상태 표시 + 일괄 연결 진입 포인트.
> 샘플 포맷: `docs/page-specs/notifications.md`

## 1. 목적
조직 구성원이 자신(또는 조직)의 사건 전체를 목록으로 조회하고, 각 사건의
허브 연결 상태 · 의뢰인 상태를 **한눈에 동일 기준**으로 확인한다.
모든 상태 배지와 CTA는 `src/lib/hub-policy.ts`의 `deriveHubState()` 결과를 써야 한다.

## 2. 기준 파일
1. Route SSoT: `src/lib/routes/registry.ts` (`ROUTES.CASES`)
2. Navigation SSoT: `src/lib/routes/navigation-map.ts`
3. Interaction SSoT: `docs/interaction-matrix.cases.md` (예정)
4. 허브 policy: `src/lib/hub-policy.ts` (`deriveHubState`, `deriveHubStateMap`, `classifyBulkConnectCases`)
5. 사건 쿼리: `src/lib/queries/cases.ts` (`getCasesPageBucketsForAuth`, `getCaseClientLinkedMap`)
6. 허브 링크 맵: `src/lib/queries/case-hubs.ts` (`getCaseHubLinkMap`, `getCaseHubList`)
7. 협력 허브 공유: `src/lib/queries/collaboration-hubs.ts` (`getCaseHubRegistrations`)
8. Consistency check: `scripts/check-navigation-consistency.mjs`

## 3. 권한 조건
1. 인증 필수
2. 현재 조직(`getEffectiveOrganizationId`) 기준 사건만
3. `assigned_cases_only` 범위 구성원은 본인 배정 사건만
4. 관리자 역할(`isManagementRole`)이면 전체 조직 사건
5. 플랫폼 관리자는 impersonation 세션일 때만 다른 조직 접근 가능

## 4. 노출 컴포넌트
1. 상단 HubContextStrip (협력/허브 요약)
2. BucketKey 필터 (active / completed / deleted)
3. UnifiedListSearch (사건 검색)
4. CaseCreateForm (신규 생성 모달)
5. CollapsibleList (사건 카드 나열)
6. `CaseHubConnectButton` — 카드별 허브 CTA
7. `CasesBulkConnectPanel` — 일괄 연결 패널 (active 버킷에서만)
8. CaseDeleteToggle (관리자만)
9. DangerActionButton (사건 삭제함 이동 / 복원 / 영구삭제)
10. 사건 변경 이력 링크 (`ROUTES.CASES`/history)
11. 빈 상태 카드
12. 권한 안내 배너 (restricted scope)

## 5. 사용 데이터
1. `selectedCases` — 현재 bucket + 검색어 필터 결과
2. `hubRegistrations` — 협력 허브 공유 현황 맵
3. `caseClientLinkedMap` — 사건별 의뢰인 연결 여부
4. `caseHubLinkMap` — 사건별 소유 허브 id 맵
5. `hubStateMap` — 위 3개로부터 `deriveHubStateMap`이 만든 단일 상태 맵 (모든 배지/버튼이 이것만 읽음)
6. `hubList` — 사이드 카드 (HubContextStrip용)
7. `bulk` — `classifyBulkConnectCases` 결과 (일괄 패널용)

## 6. 상태 정의

### 6.1 기본 상태
1. 상단에 bucket 탭 + 검색바 + "사건 추가" CTA
2. 본문은 7개까지 먼저 표시, 8개+는 CollapsibleList로 접힘
3. 각 사건 카드에 법원/사건번호, 제목, 유형, 단계, 상태, 갱신필요, 의뢰인 배지, 허브 배지

### 6.2 로딩 상태
1. SSR 기본 — 깜빡임 없음
2. Bucket 필터 변경 시 Next Link 네비게이션 (skeleton 없음)

### 6.3 빈 상태
1. filteredCases.length === 0 → "표시할 사건이 없습니다." + Briefcase 아이콘
2. 신규 조직은 CaseCreateForm 강조

### 6.4 오류 상태
1. 쿼리 실패 시 상단 오류 배너 + 재시도 CTA
2. 개별 사건 카드 로딩 에러는 카드 단위로만

### 6.5 권한 없음 상태
1. 미인증 → `/login`
2. `isRestrictedScope` true → 상단 노란 배너 ("현재 나에게 배정된 사건만 표시됩니다.")

## 7. 버튼 및 상호작용

### 7.1 사건 카드 본문 클릭
1. 동작: `${ROUTES.CASES}/${item.id}`로 이동
2. 템플릿이지만 반드시 `ROUTES.CASES` 경유

### 7.2 허브 배지
1. tone/label: `hubStateMap[item.id].badge.tone` / `.label`
2. 독자 판정 금지

### 7.3 허브 CTA (`CaseHubConnectButton`)
1. Props: `hubState` 하나만 전달
2. action.type === 'link': `action.href`로 이동 (허브 입장)
3. action.type === 'button': `CaseHubCreateSheet` 열기
4. action.type === 'info': 비활성 (의뢰인 미연결)

### 7.4 Bucket 탭 링크
1. `${ROUTES.CASES}?bucket=${key}&q=...`
2. queryFilter 유지

### 7.5 사건 변경 이력
1. `${ROUTES.CASES}/history`로 이동

### 7.6 일괄 연결 패널
1. 렌더 조건: `bucket === 'active' && !bulk.allLinked`
2. 의뢰인 미연결 건: `bulk.unlinkedClient`
3. 허브 미연결 건: `bulk.unlinkedHub`

### 7.7 삭제·복원·영구삭제
1. `DangerActionButton` 경유 (confirm modal 필수)
2. destructive → 성공 toast + revalidatePath
3. 영구삭제는 관리자만 노출

## 8. 토스트 규칙
1. 사건 목록 조회 toast 없음
2. 삭제·복원·영구삭제는 success toast
3. 실패는 사용자 문구만

## 9. 예외 처리 규칙
1. bucket 전환 중 검색어는 유지
2. 사건 생성 성공 시 `highlightCaseId` 쿼리 파라미터로 생성된 카드 강조
3. 허브 생성 sheet 실패 시 폼 내부 에러 (인라인)

## 10. 감사 로그
1. `case_list_view`
2. `case_soft_delete` / `case_restore` / `case_force_delete`
3. `case_bucket_change`

## 11. 접근성
1. 사건 카드 `Link` aria-label에 사건 제목 포함
2. 배지 색상 + 텍스트 병기 (색각 이상 대응)
3. 배경 색상만으로 상태 전달 금지

## 12. 완료 기준
1. 모든 허브 배지·CTA가 `deriveHubState()` 경유
2. 모든 href가 `ROUTES.*` 경유 (하드코딩 0)
3. 의뢰인 배지 문구가 `clients/page.tsx`의 표현과 일치
4. 상태 배지 tone이 허브·의뢰인·갱신필요 3개 도메인 규약 따름
5. 일괄 연결 패널이 `classifyBulkConnectCases()` 결과만 씀
