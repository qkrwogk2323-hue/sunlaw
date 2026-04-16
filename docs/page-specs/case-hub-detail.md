# Page Spec: Case Hub Detail (`/case-hubs/[hubId]`)

> 작성: 2026-04-16
> 지위: 사건 1건의 허브 로비. 같은 허브를 **3개 역할**(담당 법무법인, 외부 협력
> 조직, 의뢰인)이 서로 다른 권한으로 공유하는 단일 화면.
> 샘플 포맷: `docs/page-specs/notifications.md`를 따름.

## 1. 목적
하나의 사건을 중심으로 **사건 진행·비용·회수·문서·의뢰인 상태**를 한 화면에
모아 보여주는 협업 허브. 여러 조직의 참여자가 이 화면을 열어도 **같은 계산**
(= 동일 projection)을 본다. 역할에 따라 읽기/쓰기 권한만 달라진다.

## 2. 기준 파일
1. Route SSoT: `src/lib/routes/registry.ts` (`ROUTES.CASE_HUBS`)
2. Navigation SSoT: `src/lib/routes/navigation-map.ts`
3. Interaction SSoT: `docs/interaction-matrix.md` + `docs/interaction-matrix.case-hub.md` (예정)
4. UI contract key: `src/lib/interactions/registry.ts`
5. 허브 projection: `src/lib/queries/case-hub-projection.ts` (`getCaseHubProjection(caseId)`)
6. 허브 상세 쿼리: `src/lib/queries/case-hubs.ts` (`getCaseHubDetail(hubId)`)
7. 허브 policy: `src/lib/hub-policy.ts`
8. 허브 준비도 지표: `src/lib/case-hub-metrics.ts` (`calculateHubReadiness`)
9. Consistency check: `scripts/check-navigation-consistency.mjs`

## 3. 권한 조건
1. 인증 필수
2. 허브 ID(`hubId`)에 해당하는 `case_hub_organizations`에 사용자 소속 조직이
   `status = 'active'`로 등록돼 있어야 함
3. 그렇지 않으면 404 (허브 존재 자체를 노출하지 않음)
4. seat_kind 구분: `collaborator`(쓰기) / `viewer`(읽기)
5. 의뢰인(case_clients의 profile)은 `is_portal_enabled = true`이면 포털 경로 통해서만 접근
   → 직접 `/case-hubs/...`로 진입 시 `/portal/cases/...`로 리다이렉트
6. 플랫폼 관리자는 impersonation 세션일 때만 접근 가능

## 4. 노출 컴포넌트
1. `PremiumPageHeader` — 사건 제목 + 당사자 요약 + 허브 상태
2. `HubContextStrip` — 상단 가로 띠 (비용·회수·문서 요약 카드)
3. `HubReadinessRing` — 준비도 링 차트 (`calculateHubReadiness`)
4. `ParticipantSlotRing` — 참여자 슬롯 링
5. 사건 진행 섹션 (progress projection)
6. 비용·청구 섹션 (billing projection)
7. 회수·감사 섹션 (recovery projection)
8. 문서 타임라인 섹션 (documents projection — case_documents + fee_agreements 통합)
9. 의뢰인·참여자 섹션 (clients projection)
10. 감사 로그 섹션 (audit projection)
11. 역할별 활동 피드 (`ActivityFeedPanel`)
12. 빈 상태 / 오류 배너

## 5. 사용 데이터
전부 **단일 projection** 또는 이를 확장한 뷰에서 읽음. 독자 쿼리 금지.

1. `CaseHubProjection` — progress / billing / recovery / audit / documents / clients
2. `CaseHubDetail` — hubId 기준 상세 (멤버 + 활동 피드 + 조직 간 공유 정보)
3. `HubReadinessScore` — 준비도 계산 (설정 완료, 정책 적합, 수용률)
4. 현재 사용자 역할 (collaborator / viewer / client)
5. 현재 사용자의 last_read_at (unread 계산)
6. interaction_key별 대상 route

## 6. 상태 정의

### 6.1 기본 상태
1. 상단 헤더에 사건명·단계·담당자·의뢰인 요약
2. HubContextStrip에 비용 미수·회수 진척·문서 수 3개 수치
3. 본문에 6개 섹션(progress/billing/recovery/audit/documents/clients)
4. 각 섹션은 접힐 수 있고, "전체 보기"는 해당 처리 화면으로 이동
5. 활동 피드는 최근 7건 기본, 더보기 버튼

### 6.2 로딩 상태
1. SSR 기본. skeleton은 AI overview 등 지연 로드 항목에만
2. 섹션 로딩이 독립적으로 실패해도 다른 섹션은 정상

### 6.3 빈 상태
1. 새 허브는 "사건 진행 중 활동이 쌓이면 여기에 요약됩니다." 문구
2. 문서 없음: "생성된 문서가 없습니다. 사건 상세에서 생성할 수 있습니다."
3. 회수 활동 없음: "진행된 회수 이벤트가 없습니다."

### 6.4 오류 상태
1. projection 조회 실패 시 섹션 단위로 오류 배너
2. 공통 오류 문구: `허브 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.`
3. 재시도 CTA는 섹션별로

### 6.5 권한 없음 상태
1. 허브 접근 권한 없음 → 404
2. seat_kind가 viewer이면 편집 CTA 전부 비활성 + `disabledReason` 표시
3. 의뢰인이 직접 진입 → portal로 리다이렉트

## 7. 버튼 및 상호작용

### 7.1 "허브 입장" / "허브 연동" 액션
1. `deriveHubState()` 결과 기반 (`hub-policy.ts`)
2. 이 상세 페이지 진입 자체가 이미 "허브 입장" 완료 상태
3. 편집 권한 표시(collaborator)는 헤더 배지로만

### 7.2 섹션별 "전체 보기" 링크
1. Progress: `${ROUTES.CASES}/${caseId}`로 이동
2. Billing: `${ROUTES.CASES}/${caseId}?tab=billing`로 이동
3. Recovery: `${ROUTES.COLLECTIONS}?caseId=${caseId}`
4. Documents: `${ROUTES.CASES}/${caseId}?tab=documents`
5. Clients: `${ROUTES.CLIENTS}/${primaryClientKey}`
6. Audit: 플랫폼 관리자만 `${ROUTES.ADMIN_AUDIT}?case=${caseId}`

### 7.3 활동 피드 행 클릭
1. 각 로그 항목은 `interaction_key`와 `target_route`를 가짐
2. registry 경유로 이동

### 7.4 참여자 초대 (collaborator 전용)
1. interaction_key: `case_hub.invite_member`
2. 초대 sheet 열기 → `CaseHubCreateSheet` 또는 유사
3. 실패 시 error toast `초대 발송에 실패했습니다.`
4. 성공 시 toast `초대를 발송했습니다.` + 참여자 섹션 즉시 갱신

### 7.5 의뢰인 대표 설정
1. collaborator 전용
2. 현재 연결된 case_clients 중 하나 선택
3. 대표 변경 성공 toast + projection 재계산

### 7.6 PIN 재설정
1. `/case-hubs/[hubId]/pin` 서브페이지로 이동
2. owner/admin만 접근

## 8. 토스트 규칙
1. 상태 조회 자체는 success toast 없음
2. 참여자 초대, PIN 변경, 대표 의뢰인 변경 등 **상태 변경 액션**만 success toast
3. 읽음 표시 (last_read_at 갱신)는 자동 + toast 없음
4. 에러 toast는 사용자 문구만 (raw error 금지)

## 9. 예외 처리 규칙
1. 권한 강등 감지 시 편집 CTA 즉시 비활성
2. 참여자 수 상한 도달 시 초대 버튼 비활성 + `disabledReason`
3. 외부 조직 협력 종료 요청이 대기 중이면 상단 배너
4. 허브 lifecycle_status === 'archived'면 읽기 전용 모드

## 10. 감사 로그
1. `case_hub_enter` — 허브 진입
2. `case_hub_invite` — 참여자 초대
3. `case_hub_role_changed` — 권한 변경
4. `case_hub_pin_reset`
5. `case_hub_archive`
각 action은 `interaction_key`, `actor_id`, `hub_id`, `case_id`, `timestamp` 기록

## 11. 접근성
1. 6개 섹션 각 heading 유지
2. 준비도 링·슬롯 링은 `aria-label`에 수치 문구 병기
3. 활동 피드 시간은 상대 시간 + 절대 시간 title 속성
4. 키보드 탐색 가능

## 12. 완료 기준
1. 이 페이지의 6개 섹션이 전부 `getCaseHubProjection(caseId)` 결과만 읽음
2. 독자 DB 쿼리로 사건/의뢰인/문서 상태를 재계산하지 않음
3. 허브 연결 상태 표시는 `deriveHubState()` 경유
4. 의뢰인 접근 시 포털 리다이렉트 동작 확인
5. 모든 CTA가 `ROUTES.*` 또는 `resolveInteractionHref` 경유
6. 신규 CTA는 `interaction-matrix.case-hub.md`에 행 추가 후 UI 구현
