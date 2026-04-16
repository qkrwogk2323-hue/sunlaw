# Interaction Matrix — Dashboard

> 작성: 2026-04-16
> 대상: `/dashboard` 상단 `DashboardHubOverview` + 기존 `DashboardHubClient`의 cross-cutting CTA.
> 상세 포맷: `docs/interaction-matrix.notifications.md` 13컬럼 샘플 따름.
> 페이지-spec: `docs/page-specs/dashboard.md`

| interaction_key | 트리거 | 위치 | 사용자 | 노출 조건 | 비활성 조건 | 타입 | 결과 | 로딩 UX | 성공 UX | 실패 UX | 감사/로그 | 파일 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `dashboard.hub.overview_enter` | 허브 모음 행 클릭 | 대시보드 상단 `DashboardHubOverview` | 직원/관리자 | `hubs.length > 0` | 없음 | navigate | `${ROUTES.CASE_HUBS}/${hub.id}`로 이동 | Link hover 이펙트만 | toast 없음 | 허브 404 시 no-op (Next가 notFound 처리) | `dashboard_hub_overview_enter` | `src/components/dashboard-hub-overview.tsx` |
| `dashboard.hub.overview_view_all` | "전체 보기" 링크 클릭 | DashboardHubOverview 헤더 | 직원/관리자 | 항상 | 없음 | navigate | `ROUTES.CASES` 로 이동 | — | toast 없음 | — | — | `src/components/dashboard-hub-overview.tsx` |
| `dashboard.hub.overview_empty_cta` | 빈 상태 "사건 목록으로 이동" 링크 | DashboardHubOverview 빈 카드 | 직원/관리자 | `hubs.length === 0` | 없음 | navigate | `ROUTES.CASES` 로 이동 | — | toast 없음 | — | — | `src/components/dashboard-hub-overview.tsx` |
| `dashboard.notification.open` | 알림 카드 항목 클릭 | DashboardHubClient 알림 카드 | 직원/관리자 | 알림 N건 이상 | 없음 | mixed | alert target_route (없으면 `/notifications`) | — | 읽음 즉시 갱신 | — | `dashboard_notification_open` | `src/components/dashboard-hub-client.tsx` |
| `dashboard.schedule.open` | 일정 카드 항목 클릭 | DashboardHubClient 일정 카드 | 직원/관리자 | 임박 일정 존재 | 없음 | navigate | `${ROUTES.CASES}/${caseId}?tab=schedule` | — | toast 없음 | — | `dashboard_schedule_open` | `src/components/dashboard-hub-client.tsx` |
| `dashboard.billing.open` | 청구 카드 항목 클릭 | DashboardHubClient 청구 카드 | 직원/관리자 | 미납 존재 | 없음 | navigate | `${ROUTES.CASES}/${caseId}?tab=billing` | — | toast 없음 | — | `dashboard_billing_open` | `src/components/dashboard-hub-client.tsx` |

## 점검 체크리스트
1. `DashboardHubOverview`의 `hubs` prop은 `getCaseHubList(organizationId)` 결과만 사용 (독자 쿼리 금지)
2. 각 행 링크는 `ROUTES.CASE_HUBS`/`${hub.id}` 경유 (하드코딩 금지, navigation consistency check로 차단)
3. 허브 상태 수치(진행률, 미읽음, 최근 활동)는 `CaseHubSummary` 필드 그대로 사용 — UI가 재계산 금지
4. 빈 상태는 카드 안의 안내로 해결 (별도 페이지 이동 아님)
5. 하단 `DashboardHubClient`의 개별 카드는 `docs/interaction-matrix.dashboard.md`의 위 항목 외 CTA를 추가할 때 여기에 행 먼저 추가 후 UI 구현
