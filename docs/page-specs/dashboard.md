# Page Spec: Dashboard (`/dashboard`)

> 작성: 2026-04-16
> 지위: 직원(staff/manager) 계정의 진입 기본 페이지. **사용자용 지도** 역할.
> 샘플 포맷: `docs/page-specs/notifications.md`를 따름.

## 1. 목적
조직 구성원이 로그인 직후 도달하는 **참여 허브 모음 뷰**.
"어느 방(사건 허브)으로 지금 들어가야 하는가"를 한눈에 보여주는 안내 데스크.

### 1.1 레이아웃 원칙 (허브 모음 뷰)
- **상단**: 참여 중인 허브 N개 (사건당 한 줄 요약)
  `사건명 — 준비 82% · 미읽음 3 · 미납 0 · 최근 12분 전`
  각 줄 클릭 → 해당 `/case-hubs/[hubId]` 상세로 이동
- **하단**: 오늘 할 일 cross-case 리스트
  일정·마감·긴급 알림 시간 축 중심으로 통합
- 기존의 흩어진 카드(알림/메시지/요청/청구/팀)는 **상단 줄의 축약 수치**로 흡수

### 1.2 허브 대비 역할
- **허브**(`/case-hubs/[hubId]`) = 방 안 (한 사건의 모든 progression)
- **대시보드**(`/dashboard`) = 현관 (어느 방이 지금 급한지 훑기)
- **별도 "지도" 페이지 신설 금지** — 대시보드가 사용자용 지도
- 대시보드는 **projection의 요약만** 읽는다. 카드가 독자 쿼리로 사건 상태를 다시 계산하지 않는다.

## 2. 기준 파일
1. Route SSoT: `src/lib/routes/registry.ts` (`ROUTES.DASHBOARD`)
2. Navigation SSoT: `src/lib/routes/navigation-map.ts`
3. Interaction SSoT: `docs/interaction-matrix.md` + `docs/interaction-matrix.dashboard.md` (예정)
4. UI contract key: `src/lib/interactions/registry.ts`
5. 허브 projection: `src/lib/queries/case-hub-projection.ts`
6. 허브 policy: `src/lib/hub-policy.ts`
7. Dashboard 초기 snapshot: `src/lib/queries/dashboard.ts` (`getDashboardInitialSnapshotForAuth`)
8. Consistency check: `scripts/check-navigation-consistency.mjs`
9. AI overview: `src/lib/ai/dashboard-home.ts` (`buildDashboardAiOverview`)

## 3. 권한 조건
1. 인증 필수 — 미인증이면 `/login` 리다이렉트
2. `getDefaultAppRoute(auth, organizationId) !== '/dashboard'`이면 해당 기본 경로로
   리다이렉트 (의뢰인 계정은 `/portal`로)
3. 플랫폼 관리자는 roleLabel에 "플랫폼 관리자" 표기
4. 조직 관리자(org_owner / org_manager)는 roleLabel에 "조직 관리자"
5. 기타 구성원은 "조직 구성원"
6. 현재 조직 범위(`getEffectiveOrganizationId`)에 속한 데이터만 조회
7. assigned_cases_only 범위의 구성원은 본인 배정 사건만 표시

## 4. 노출 컴포넌트
1. `DashboardHubClient` (최상위)
2. AI 오버뷰 카드 (`initialAiOverview`)
3. 사건 요약 섹션 (최근 수정 사건 N건)
4. 일정 카드 (임박 일정 N건)
5. 알림 요약 카드 (unread count + 최근 N건)
6. 요청·메시지 카드
7. 청구·미납 요약 카드
8. 협력 허브/사건 허브 카드
9. 팀 멤버·로드 카드
10. 비어 있음 안내
11. 오류 안내 배너

## 5. 사용 데이터
아래는 **허브 projection을 기반으로 요약**된 데이터만 읽는다. 각 카드가 추가 DB
쿼리를 수행하지 않는다.

1. `DashboardSummary` — activeCases / pendingDocuments / pendingRequests /
   recentMessages / pendingBillingCount / unreadNotifications
2. `DashboardScheduleItem[]` — 상단 일정 카드
3. `DashboardCaseItem[]` — 최근 수정된 사건 목록
4. `DashboardRequestItem[]`
5. `DashboardMessageItem[]`
6. `DashboardBillingItem[]`
7. `DashboardNotificationItem[]` — 알림 카드 (최근 N건만)
8. 팀/허브 요약 — `getCaseHubsForCases` 기반
9. `initialAiOverview` — AI가 생성한 조합 요약
10. 역할 라벨 (`roleLabel`) — 플랫폼 관리자 / 조직 관리자 / 조직 구성원

## 6. 상태 정의

### 6.1 기본 상태
1. 상단에 역할 라벨 + 조직명 + AI 오버뷰
2. 좌측에 사건·일정·요청, 우측에 알림·청구·허브 (반응형 1~2컬럼)
3. 각 카드는 3~7개 항목만 표시, "더보기"는 처리 화면으로 이동

### 6.2 로딩 상태
1. 초기 snapshot은 서버 컴포넌트에서 SSR — 플래시 없음
2. AI overview만 클라이언트에서 지연 로드할 경우 skeleton
3. 모든 카드가 동시에 로딩되는 일은 없음

### 6.3 빈 상태
1. 각 카드는 데이터 0건이면 "표시할 X이 없습니다." + 관련 처리 페이지 링크
2. 신규 조직인 경우 온보딩 CTA 표시 (사건 만들기, 의뢰인 초대)

### 6.4 오류 상태
1. snapshot 조회 실패 시 해당 카드만 오류 배너 표시 (다른 카드는 정상 유지)
2. 오류 배너는 `알림을 불러오지 못했습니다.` 같은 사용자 문구만
3. raw error / JSON / stack trace 노출 금지
4. 각 카드에 독립적인 새로고침 CTA 제공 가능

### 6.5 권한 없음 상태
1. 조직 미소속이면 `/start` 또는 `/organization-request`로 리다이렉트
2. 범위 축소된 카드는 `현재 나에게 배정된 항목만 표시됩니다.` 안내 띄움

## 7. 버튼 및 상호작용

### 7.1 사건 카드 클릭
1. interaction_key: `dashboard.case.open`
2. 동작: 해당 사건 상세 (`${ROUTES.CASES}/${caseId}`)로 이동
3. 직접 href 하드코딩 금지 — `ROUTES.CASES` 경유

### 7.2 "사건 전체 보기" 링크
1. `ROUTES.CASES`로 이동
2. 현재 조직 범위 유지

### 7.3 알림 카드의 알림 한 건 클릭
1. interaction_key: `notifications.open`
2. navigate 또는 mixed — target_route가 있으면 해당 페이지로, 없으면 `/notifications`
3. 대시보드에서 읽음 처리 직접 금지 — 클릭 후 알림센터에서 처리

### 7.4 알림 "더보기" 링크
1. `ROUTES.NOTIFICATIONS`로 이동
2. unreadCount 숫자가 배지로 붙음

### 7.5 허브 카드의 "허브 입장" 또는 "허브 연동"
1. **`hub-policy.deriveHubState()` 결과 기반** — 대시보드가 독자 판정 금지
2. action.type === 'link'이면 `action.href`로 이동
3. action.type === 'button'이면 create sheet 열기
4. action.type === 'info'이면 비활성 + 툴팁

### 7.6 청구/미납 "바로 처리" 링크
1. 해당 사건의 청구 탭(`${ROUTES.CASES}/${caseId}?tab=billing`)으로 이동

### 7.7 AI overview "전체 보기" 링크
1. `ROUTES.DASHBOARD` (현재 페이지) 기준 쿼리 파라미터로 AI 패널 열기

## 8. 토스트 규칙
1. 대시보드는 조회 화면 — success toast 없음
2. AI 갱신 성공 toast 금지
3. 오류는 배너, 개별 카드 에러는 해당 카드 내부
4. 읽음 처리 · 해결 처리는 **이 화면에서 수행하지 않음** → 알림센터로 유도

## 9. 예외 처리 규칙
1. 특정 카드만 실패한 경우 전체 페이지 실패로 간주하지 않음
2. 조직이 pending 상태면 온보딩 문구 + `ROUTES.ORGANIZATION_REQUEST` 링크
3. 권한 강등 등 중도 변경 감지되면 카드 단위 재조회 대신 페이지 새로고침 권장

## 10. 감사 로그
1. `dashboard_view` — 대시보드 진입 (org + role + snapshot 요약)
2. `dashboard_card_click` — 카드 클릭 (카드 유형 + 대상 id)
3. AI overview 생성은 별도 로그 (`ai_dashboard_overview_generated`)

## 11. 접근성
1. 모든 카드 제목은 heading 레벨 유지 (h2 또는 h3)
2. 숫자 배지는 스크린리더가 읽을 수 있도록 `aria-label` 제공
3. 키보드 탭 순서는 상단 → 좌측 → 우측 그리드 순
4. focus ring 제거 금지

## 12. 완료 기준
1. 모든 카드가 `getDashboardInitialSnapshotForAuth` 또는 `getCaseHubProjection`
   결과만 읽는다 (독자 DB 쿼리 추가 금지)
2. 모든 링크가 `ROUTES.*` 또는 `resolveInteractionHref(INTERACTION_KEYS.*)` 경유
3. 허브 배지·버튼은 `deriveHubState()` 결과만 사용
4. 알림 unread count는 알림센터의 unread count와 동일한 feed 기준
5. 미납/청구 수치는 `case-hub-projection.billing` 기준
6. 사건 목록의 상태 배지는 `cases/page.tsx`와 동일 문구
7. 새 CTA 추가 시 `interaction-matrix.dashboard.md`에 행 먼저 추가, 그 다음 UI 구현
