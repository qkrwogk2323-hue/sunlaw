# System Map

> 최종 갱신: 2026-04-16
> 지위: **내부용 지도** (필수). 모든 페이지·컴포넌트·인터랙션의 관계를 한 장으로 정리.
> 사용자용 별도 "지도" 페이지는 만들지 않음 — **대시보드가 사용자용 지도** 역할을 맡음 (참여 허브 모음 뷰로 재설계 예정).
> 연결 문서: `docs/page-specs/*`, `docs/interaction-matrix.md`, `src/lib/routes/registry.ts`, `src/lib/routes/navigation-map.ts`.

## 0) 개념 축

| 축 | 역할 | 비유 |
|---|---|---|
| **사건 허브** (`/case-hubs/[hubId]`) | 한 사건의 모든 projection을 묶은 "방 안" | 상황실 |
| **대시보드** (`/dashboard`) | 참여 허브 모음 + 오늘 할 일 "방 밖" | 현관 |
| **포털** (`/portal`) | 의뢰인 전용 — 자기 사건 1개 뷰 | 손님방 |
| **알림센터** (`/notifications`) | cross-cutting 처리 페이지 | 메시지 보관소 |
| **목록 페이지** (`/cases`, `/clients`, `/documents` 등) | 도메인별 인벤토리 | 서류함 |
| **관리** (`/admin/*`) | 플랫폼 관리자만 | 운영실 |
| **설정** (`/settings/*`) | 조직·개인 설정 | 준비실 |

각 축은 `src/lib/queries/case-hub-projection.ts`의 **단일 projection**을 읽기만 한다. 독자 계산 금지.

---

## 1) 페이지 목록 — 공개/진입

| 페이지명 | 경로 | 목적 | 접근권한 | 관련 컴포넌트 | 진입점 | 다음 화면 |
|---|---|---|---|---|---|---|
| 랜딩 | `/` | 서비스 소개 및 진입 | 전체 | `src/app/page.tsx` | 직접 URL / 외부 링크 | `/start`, `/login` |
| 로그인 | `/login` | 인증 시작 | 전체 | `src/app/login/page.tsx` | 랜딩, 보호 라우트 redirect | 역할별 기본 홈 |
| 시작 | `/start` | 가입 경로 분기 허브 | 전체 | `src/app/start/page.tsx` | 랜딩 시작하기 | `/start/signup`, `/login` |
| 회원가입 | `/start/signup` | 신규 가입 | 전체 | `src/app/start/signup/page.tsx` | `/start` | 역할별 후속 단계 |
| 비밀번호 재설정 | `/start/password-reset` | 비번 리셋 | 전체 | `src/app/start/password-reset/page.tsx` | `/login` | `/login` |
| OAuth 콜백 | `/auth/callback` | 카카오 OAuth 반환 | 전체 | `src/app/auth/callback/*` | 외부 OAuth | next 쿼리 경로 또는 `/login?error=...` |
| 조직 신청 | `/organization-request` | 새 조직 생성 신청 | 인증 사용자 | `src/app/organization-request/page.tsx` | 회원가입 후 | `/start/pending` |
| 의뢰인 접근 | `/client-access` | 초대번호 입력 / 조직 검색 | 전체 | `src/app/client-access/*` | 직접 URL | `/login`, 포털 |
| 초대 수락 | `/invite/[token]` | 초대 링크 수락 | 전체 (→ 인증 유도) | `src/app/invite/[token]/*` | 이메일 링크 | 역할별 홈 |
| 점검 안내 | `/maintenance` | 점검 중 안내 | 전체 | `src/app/maintenance/*` | 서비스 상태 | — |

## 2) 페이지 목록 — 직원/관리자 앱 (app group)

| 페이지명 | 경로 | 목적 | 접근권한 | 관련 컴포넌트 | Projection 사용 | 다음 화면 |
|---|---|---|---|---|---|---|
| 대시보드 | `/dashboard` | **사용자용 지도** — 참여 허브 요약 + 오늘 할 일 | 직원/관리자 | `src/components/dashboard-hub-client.tsx` | `getDashboardInitialSnapshotForAuth` + (예정) 허브별 projection 요약 | 각 허브 상세, 알림센터, 사건 목록 |
| 알림센터 | `/notifications` | 알림 처리 단일 화면 | 인증 사용자 | `src/app/(app)/notifications/page.tsx`, `NotificationsArchiveButton` | `notifications feed` | 알림 target_route |
| 사건 목록 | `/cases` | 사건 인벤토리 + 허브 연결 상태 | 직원/관리자 | `src/app/(app)/cases/page.tsx`, `CaseHubConnectButton`, `CasesBulkConnectPanel` | `hub-policy.deriveHubStateMap` | 사건 상세, 사건 허브 상세 |
| 사건 상세 | `/cases/[caseId]` | 사건 편집·탭(개요/청구/문서 등) | 직원/관리자 | `src/app/(app)/cases/[caseId]/page.tsx` | 부분적 projection | 사건 허브, 허브 문서 탭 |
| 사건 이력 | `/cases/history` | 사건 변경 감사 로그 | 관리자 | `src/app/(app)/cases/history/*` | — | 사건 상세 |
| 개인회생 탭 | `/cases/[caseId]/rehabilitation` | 개인회생 자동작성 모듈 | 직원/관리자 | `rehabilitation/tabs/*` | — (도메인 전용) | 사건 상세 |
| 파산 탭 | `/cases/[caseId]/bankruptcy` | 파산 자동작성 모듈 | 직원/관리자 | `bankruptcy/tabs/*` | — | 사건 상세 |
| 사건 허브 목록 | `/case-hubs` | 참여 허브 목록 | 직원/관리자 | `src/app/(app)/case-hubs/page.tsx` | `getCaseHubList` | 허브 상세 |
| **사건 허브 상세** | `/case-hubs/[hubId]` | **한 사건의 방** — 6개 projection 섹션 | 허브 참여자 | `src/app/(app)/case-hubs/[hubId]/page.tsx` | `getCaseHubProjection(caseId)` + `getCaseHubDetail(hubId)` | 사건 상세, 각 처리 화면 |
| 허브 PIN | `/case-hubs/[hubId]/pin` | PIN 재설정 | 허브 owner/admin | `case-hubs/[hubId]/pin/*` | — | 허브 상세 |
| 협력 Inbox | `/inbox` | 협력 요청 + 활성 허브 | 직원/관리자 | `src/app/(app)/inbox/page.tsx` | `getCollaborationOverview` | 협력 허브 상세 |
| 협력 허브 상세 | `/inbox/[hubId]` | organization_collaboration_hubs 뷰 | 조직 멤버 | `inbox/[hubId]/page.tsx` | — | 사건 상세 |
| 의뢰인 roster | `/clients` | **내부 운영 뷰** (roster) | 직원/관리자 | `src/app/(app)/clients/page.tsx` | `listClientPageRoster` (roster 전용) | 의뢰인 상세 |
| 의뢰인 상세 | `/clients/[clientKey]` | 개인 상세·활동 피드 | 직원/관리자 | `clients/[clientKey]/*` | `getClientDetailSummary` | 사건, 허브 |
| 의뢰인 이력 | `/clients/history` | 초대·변경 이력 | 관리자 | `clients/history/*` | — | 의뢰인 상세 |
| 문서함 | `/documents` | 문서 타임라인 (case_documents 단일 소스) | 직원/관리자 | `src/app/(app)/documents/*` | `listDocuments` | 문서 다운로드 |
| 계약서 | `/contracts` | 수임·정산 계약 | 직원/관리자 | `src/app/(app)/contracts/*` | **case_documents로 통합 예정 (Task 4)** | 사건 상세, 청구 |
| 청구 | `/billing` | 비용·청구 인벤토리 | 직원/관리자 | `src/app/(app)/billing/*` | `getBillingHubSnapshot` | 사건 청구 탭 |
| 회수 | `/collections` | 회수 인벤토리 | 직원/관리자 | `src/app/(app)/collections/*` | `getCollectionsWorkspace` | 사건 상세 |
| 조직 | `/organizations` | 협력 조직 목록 | 직원/관리자 | `src/app/(app)/organizations/*` | — | 조직 상세 |
| 일정 | `/calendar` | 캘린더 뷰 | 직원/관리자 | `src/app/(app)/calendar/*` | `getCalendarMonthForAuth` | 일정 편집 |
| 리포트 | `/reports` | 조직 지표 | 관리자 | `src/app/(app)/reports/*` | — | — |
| 지원 | `/support` | 고객 지원 티켓 | 직원/관리자 | `src/app/(app)/support/*` | — | — |
| 데모 | `/demo` | 시연 화면 | 전체 | `src/app/(app)/demo/*` | — | — |

## 3) 페이지 목록 — 의뢰인 포털

| 페이지명 | 경로 | 목적 | 접근권한 | 관련 컴포넌트 | Projection 사용 |
|---|---|---|---|---|---|
| 포털 홈 | `/portal` | 내 사건 요약 + 알림 | 의뢰인 | `src/app/portal/page.tsx` | **client-portal.ts (예정, 최소권한 쿼리)** |
| 내 사건 | `/portal/cases` | 자기 사건 목록 | 의뢰인 | `src/app/portal/cases/*` | client-portal 전용 |
| 내 메시지 | `/portal/messages` | 요청·응답 | 의뢰인 | `src/app/portal/messages/*` | — |
| 내 알림 | `/portal/notifications` | 포털 전용 알림 | 의뢰인 | `src/app/portal/notifications/*` | — |
| 내 계정 | `/portal/account` | 의뢰인 프로필 | 의뢰인 | `src/app/portal/account/*` | — |
| 청구서 | `/portal/billing` | 내 청구 내역 | 의뢰인 | `src/app/portal/billing/*` | — |

## 4) 페이지 목록 — 설정/관리

| 페이지명 | 경로 | 목적 | 접근권한 |
|---|---|---|---|
| 설정 허브 | `/settings` | 탭 진입 | 인증 사용자 |
| 팀 설정 | `/settings/team` | 멤버 관리 | 조직 관리자 |
| 본인 설정 | `/settings/team/self` | 본인 계정 | 인증 사용자 |
| 조직 설정 | `/settings/organization` | 조직 정보 | 조직 관리자 |
| 구독/결제 | `/settings/subscription` | 요금제 | 조직 관리자 |
| 콘텐츠 | `/settings/content` | 공지/템플릿 | 조직 관리자 |
| 기능 플래그 | `/settings/features` | 기능 on/off | 조직 관리자 |
| 플랫폼 | `/settings/platform` | 플랫폼 전역 | 플랫폼 관리자 |
| 플랫폼 감사 | `/admin/audit` | 감사 로그 | 플랫폼 관리자 |
| 조직 신청 검토 | `/admin/organization-requests` | 승인 큐 | 플랫폼 관리자 |
| 전체 조직 | `/admin/organizations` | 조직 관리 | 플랫폼 관리자 |
| 지원 | `/admin/support` | 고객 티켓 | 플랫폼 관리자 |
| 모듈 | `/admin/modules` | 기능 모듈 관리 | 플랫폼 관리자 |

## 5) 핵심 컴포넌트 목록

| 컴포넌트 | 사용 페이지 | 주요 props | 역할 | 단일 원천 |
|---|---|---|---|---|
| `DashboardHubClient` | `/dashboard` | `data`, `currentUserId`, `isPlatformAdmin` | 대시보드 전체 렌더 | `getDashboardInitialSnapshotForAuth` |
| `CaseHubConnectButton` | `/cases` | `hubState` (from `deriveHubState`) | 허브 진입/연동/의뢰인 미연결 CTA | `hub-policy.ts` |
| `CasesBulkConnectPanel` | `/cases` (active bucket) | `unlinkedClientCaseIds`, `unlinkedHubCaseIds` | 일괄 연결 | `classifyBulkConnectCases` |
| `CaseHubCreateSheet` | `/cases` | `caseId`, `organizationId` | 허브 생성 모달 | — |
| `NotificationsArchiveButton` | `/notifications` | — | 보관함 토글 | `resolveInteractionHref(NOTIFICATIONS_ARCHIVE_LIST)` |
| `ClientActionForm` | 폼 전반 | `action`, `successTitle` | 서버액션 + toast 래퍼 | — |
| `DangerActionButton` | destructive 액션 | `action`, `fields`, `confirmDescription` | 확인 모달 + 액션 | — |
| `HubContextStrip` | `/cases`, `/case-hubs/[hubId]` | 허브 수치 요약 | 상단 띠 | — |
| `HubReadinessRing` | `/case-hubs/[hubId]` | 준비도 점수 | 링 차트 | `calculateHubReadiness` |
| `ParticipantSlotRing` | `/case-hubs/[hubId]` | 슬롯 카운트 | 참여자 슬롯 | — |
| `ActivityFeedPanel` | `/case-hubs/[hubId]` | 활동 로그 | 피드 | `getCaseHubDetail` |
| `BrandBanner` | 랜딩, 앱 레이아웃 | `href`, `theme` | 로고 | `ROUTES` |
| `SettingsNav` | `/settings/*` | `currentPath` | 설정 탭 | `NAVIGATION_MAP` |
| `PageBackButton` | 앱 레이아웃 | `fallbackHref`, `topLevelRoutes` | 뒤로가기 | `ROUTES` |

## 6) 데이터 계층 (쿼리 / 스키마)

| 이름 | 역할 | 파일 | 수정 권한 | 연결 화면 |
|---|---|---|---|---|
| `ROUTES` | 라우팅 기준 | `src/lib/routes/registry.ts` | FE 공통 | 전역 |
| `NAVIGATION_MAP` | UI 요소별 이동 맵 | `src/lib/routes/navigation-map.ts` | FE 공통 | 전역 |
| `INTERACTION_REGISTRY` / `INTERACTION_KEYS` | 버튼 계약 | `src/lib/interactions/registry.ts`, `notifications-keys.ts` | FE 공통 | 알림, 허브 |
| `hub-policy` | 허브 상태 단일 판정 | `src/lib/hub-policy.ts` | FE 공통 | `/cases`, `/dashboard`, `CaseHubConnectButton` |
| **`case-hub-projection`** | 사건 1건 6섹션 통합 | `src/lib/queries/case-hub-projection.ts` | FE 공통 | `/case-hubs/[hubId]`, `/dashboard` (예정) |
| `case-hubs queries` | 허브 링크 맵 / 목록 / 상세 | `src/lib/queries/case-hubs.ts` | FE 공통 | `/cases`, `/case-hubs/*` |
| `collaboration-hubs queries` | 협력 허브 / case-share | `src/lib/queries/collaboration-hubs.ts` | FE 공통 | `/inbox/*` |
| `notifications queries` | 알림 feed | `src/lib/queries/notifications.ts` | FE 공통 | `/notifications`, `/dashboard` |
| `dashboard queries` | 초기 snapshot | `src/lib/queries/dashboard.ts` | FE 공통 | `/dashboard` |
| `clients-roster` (예정) | **내부 운영 뷰 전용** | `src/lib/queries/clients-roster.ts` (Task 3) | FE 공통 | `/clients` |
| `client-portal` (예정) | **의뢰인 최소권한 뷰** | `src/lib/queries/client-portal.ts` (Task 3) | FE 공통 | `/portal/*` |
| `billing queries` | 청구 집계 | `src/lib/queries/billing.ts` | FE 공통 | `/billing`, 허브 projection |
| `collections queries` | 회수 집계 | `src/lib/queries/collections.ts` | FE 공통 | `/collections`, 허브 projection |
| `documents queries` | 문서 타임라인 | `src/lib/queries/documents.ts` | FE 공통 | `/documents`, 허브 projection |
| `audit queries` | 감사 로그 | `src/lib/queries/audit.ts` | FE 공통 | `/admin/audit`, 허브 projection |
| `PII 암호화` | resident_number 등 암호화 | `src/lib/pii.ts` (v2-only) | BE | 의뢰인·당사자 관련 |
| `app-entry-policy` | 로그인 후 경로 결정 | `src/lib/app-entry-policy.ts` | FE/BE 협업 | 로그인 → 역할별 홈 |

## 7) 인터랙션 요약 (도메인별 상세는 `docs/interaction-matrix.*.md`)

| 트리거 | 조건 | 결과 | 실패 처리 | 관련 파일 |
|---|---|---|---|---|
| 랜딩 시작하기 | 인증 여부 | 인증 시 기본 앱 경로, 비인증 시 `/start` | 없음 | `src/app/page.tsx` |
| 로그인 성공 | 역할 + 조직 소속 | 기본 홈(직원=`/dashboard`, 의뢰인=`/portal`, 플랫폼 관리자=`/admin/*` 입구) | 에러 쿼리 노출 | `app-entry-policy.ts` |
| 사건 카드 클릭 | 인증 + 조직 범위 | `${ROUTES.CASES}/${caseId}` | — | `cases/page.tsx` |
| 허브 배지/버튼 | `deriveHubState()` 결과 | 허브 입장 / 허브 연동 / 의뢰인 미연결 | state=error | `hub-policy.ts`, `CaseHubConnectButton` |
| 알림 행 열기 | interaction_key 존재 | target_route로 이동 (mixed: mark-read 병행) | 권한 없음 시 대체 | `docs/interaction-matrix.notifications.md` |
| 문서 다운로드 | 권한 + 경로 존재 | signed URL 5분 유효 | 만료 시 재요청 | `document-download-actions.ts` |
| 의뢰인 명단 클릭 | 직원 계정 | `${ROUTES.CLIENTS}/${clientKey}` | 의뢰인 계정이면 `/portal` 리다이렉트 | `clients/page.tsx` |

## 8) 네비게이션 의존 규칙 (엄격)

1. 신규 UI는 `ROUTES.*` 또는 `${ROUTES.X}/...` 템플릿 경유. 문자열 직접 박기 금지.
2. `resolveInteractionHref(INTERACTION_KEYS.*)`는 알림·동적 CTA 전용. 정적 네비게이션은 `ROUTES` 사용.
3. `router.push`, `redirect`도 동일 규약. server action 내부에서도 가급적 `ROUTES` 사용.
4. `scripts/check-navigation-consistency.mjs`가 회귀 감지 (baseline 100 → 0 수렴 목표).
5. 모든 페이지는 `docs/page-specs/<name>.md`에 12섹션 spec 필요. spec 없이 UI 신규 구현 금지.
6. 모든 CTA는 `docs/interaction-matrix.<domain>.md`에 13컬럼 행이 선행해야 함.

## 9) 권한 분류

| 역할 | 접근 가능 | 접근 불가 |
|---|---|---|
| 비인증 | 랜딩, `/login`, `/start`, `/organization-request`, `/invite/*`, `/client-access` | 그 외 전부 |
| 의뢰인 (is_client_account) | `/portal/*` | 직원 앱 전부 (`/dashboard`, `/cases` 등 접근 시 `/portal` 리다이렉트) |
| 조직 구성원 (org_staff) | 직원 앱 전부(읽기), 본인 배정 사건 편집 | `/admin/*`, 조직 설정 편집 |
| 조직 관리자 (org_manager/org_owner) | 조직 설정 + 팀 관리 + 조직 사건 전체 | `/admin/*` (플랫폼 제외) |
| 플랫폼 관리자 | `/admin/*`, impersonation, 전체 조직 read | 대시보드 전용 기능(자기 조직 뷰는 조직 전환 후) |

## 10) 운영 원칙

1. 라우트 문자열은 신규 코드에서 하드코딩하지 않고 `ROUTES` 사용
2. UI 이벤트별 링크는 `NAVIGATION_MAP` 또는 `resolveInteractionHref` 경유
3. 상태 전이(로그인 전/후, 권한 없음, 빈 상태, 에러)는 page-spec + 정책 코드 양쪽에 반영
4. 허브 상태 계산은 `hub-policy.deriveHubState()`만 사용 — UI에서 중복 계산 금지
5. 같은 사건의 projection은 `getCaseHubProjection(caseId)` 한 곳에서만 읽는다
6. 의뢰인 포털은 `client-portal.ts` (최소권한), 직원 roster는 `clients-roster.ts` — 쿼리 계층 교차 금지
7. 문서는 `case_documents` 단일 타임라인으로 수렴 (계약서 포함)
8. 대시보드 = 참여 허브 모음 뷰 (사용자용 지도). 별도 "지도" 페이지 신설 금지
9. **허브는 전역 메뉴가 아니다.** 사건 1건의 작업 모드로만 진입. 진입 경로는 3곳:
   (1) 대시보드 허브 모음 줄 클릭, (2) 사건 목록 카드의 "허브 입장" 버튼,
   (3) 알림·문서·요청의 사건 연동 CTA. 좌측 사이드바의 "사건허브" 메뉴 항목은
   2026-04-16 제거됨 (개념 중복 방지).
10. system-map(이 문서) + page-spec + interaction-matrix가 모든 새 기능의 **선행 문서**
