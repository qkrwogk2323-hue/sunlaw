# 의뢰인 온보딩 E2E 감사 — Gap Report

> 작성: 2026-04-19
> 대상: 직원 → 의뢰인 7단계 온보딩 흐름
> 방법: 코드 경로 추적 (2개 병렬 에이전트 + 수동 확인)

---

## 요약

| 단계 | 설명 | 상태 | Gap |
|------|------|------|-----|
| 1 | 조직 가입 요청 → 승인 | ✅ | — |
| 2 | 사건 생성 → 허브 연동 | ✅ 의도된 설계 | 허브는 선택적. 기록용 사건은 허브 없이 운영. `createCaseHubAction` 별도 분리는 의도. |
| 3 | 의뢰인 초대 → 포털 활성화 | ✅ | — |
| 4 | 직원: 문서 등록 → 알림 | ✅ | staging 15/15 검증 완료 |
| 5 | 의뢰인: 포털 → 알림 → 문서 | ✅ | — |
| 6 | 직원: 청구 발행 → 의뢰인 확인 | ❌ P0 | 의뢰인에게 청구 알림 안 감 |
| 7 | 의뢰인: 계약 서명 → 직원 확인 | ❌ P0 | 직원에게 서명 완료 알림 안 감 |

**P0 2건 (수정 완료), P1 0건.** P0은 양방향 피드백 루프가 끊긴 것 — 의뢰인은 청구 사실을 모르고, 직원은 서명 완료를 모름. 허브 비연동은 의도된 설계(기록용 사건).

---

## 단계별 상세

### 1. 조직 가입 요청 → 승인 ✅

- 신청: `submitOrganizationSignupRequestAction` (`organization-actions.ts:1170`)
- 승인: `reviewOrganizationSignupRequestAction` (`organization-actions.ts:1470`)
- RPC: `approve_organization_signup_request_atomic`
- 알림: ✅ 신청자에게 승인 알림 (`destination_url: /organizations`)
- CTA: ✅ 승인 후 조직 페이지로 redirect

### 2. 사건 생성 → 허브 연동 ⚠️ P1

- 생성: `createCaseAction` (`case-actions.ts:631`) → RPC `create_case_atomic`
- **허브 자동 생성: ❌** — RPC는 `cases`, `case_handlers`, `case_organizations`만 생성. `case_hubs` 행 없음.
- 허브 생성: 별도 `createCaseHubAction` (`case-hub-actions.ts:51`) 수동 호출 필요
- 사건 상세에 "허브 연동" CTA 있음 (`cases/[caseId]/page.tsx:328-350`) — 단, 허브가 먼저 존재해야 활성화
- **끊김**: 사건 생성 직후 "허브를 만드세요"라는 안내가 없음. 사용자가 `/case-hubs`로 가서 수동 생성해야 함.

### 3. 의뢰인 초대 → 포털 활성화 ✅

- 초대: `invitations` 테이블 + 이메일 토큰
- 수락: `acceptInvitationAction` (`organization-actions.ts:3872`)
- 사건 연결: `attachClientAccessRequestToCaseAction` (`organization-actions.ts:3713`)
- `is_portal_enabled=true` 시 → `profiles.is_client_account=true`, `client_account_status='active'`
- 알림: ✅ 의뢰인에게 포털 링크 알림
- RLS: ✅ `case_clients.is_portal_enabled=true AND profile_id=current_user` 필터

### 4. 직원: 문서 등록 (client_visible) → 알림 ✅

- 액션: `addDocumentAction` (`case-actions.ts:983`)
- 알림: ✅ `notifyDocumentStakeholders` → `DOCUMENT_SHARED_WITH_CLIENT`
- destination: `/portal/cases/:caseId`
- 포털 필터: `.eq('client_visibility', 'client_visible')` (portal.ts:434)
- **staging 15/15 검증 완료** (`VERIFICATION_RESULT_document_notifications_2026-04-17.md`)

### 5. 의뢰인: 포털 진입 → 알림 → 문서 타임라인 ✅

- 포털: `/portal` → `/portal/cases` → `/portal/cases/[caseId]`
- 알림 페이지: ✅ `/portal/notifications` 존재
- 문서 타임라인: ✅ `CaseHubDocumentTimeline` 렌더 (portal/cases/[caseId]/page.tsx)
- destination 착륙: ✅ `/portal/cases/:caseId` → 문서 즉시 표시

### 6. 직원: 청구 발행 → 의뢰인 확인 ❌ P0

- 액션: 사건 허브 비용 탭 (`/cases/[caseId]?tab=billing`) → `BillingEntryForm`
- 서버: `addBillingEntryAction` (`case-actions.ts:1913`) 또는 `createBillingFollowUp`
- 직원 알림: ✅ `BILLING_ENTRY_CREATED` → `org_managers_and_assigned`
- **의뢰인 알림: ❌ 없음** — policy 테이블에 의뢰인 대상 billing 알림 타입 미정의
- 포털 데이터: ✅ `/portal/cases/[caseId]` "청구/입금" 섹션에 표시 (`bill_to_case_client_id` 필터)
- 포털 허브: ✅ `/portal/billing`에서도 cross-case 표시
- **끊김**: 데이터는 포털에 보이지만, **의뢰인이 새 청구가 생겼다는 걸 알 방법이 없음**. 직접 포털에 접속해야만 확인 가능.

### 7. 의뢰인: 계약 서명 → 직원 확인 ❌ P0

- 의뢰인 진입: `/portal/cases/[caseId]` → "서명 요청 받은 계약" 섹션
- 서명 폼: `PortalContractSignatureForm` (`portal-contract-signature-form.tsx`)
- 서명 액션: `confirmPortalContractSignatureAction` (`client-account-actions.ts:307`)
  - RPC: `complete_portal_contract_signature`
  - `terms_json.signature_status='completed'` + `signature_completed_at` + `signature_logs` 업데이트
  - `case_requests.status='completed'` 업데이트
- 직원 알림: ❌ **없음** — `case_messages` insert만 있음 (내부 메시지), notification insert 없음
- 직원 화면 갱신: ✅ `revalidatePath('/contracts')`, `revalidatePath('/cases/[caseId]')`
- **끊김**: 직원이 계약 관리 또는 사건 상세를 **직접 방문하지 않으면** 서명 완료를 모름.

---

## 수정 계획

### P0-1: 청구 생성 시 의뢰인 알림 (단계 6)

**추가할 것:**
- `NOTIFICATION_TYPES.BILLING_SHARED_WITH_CLIENT` 신규 정의
- policy: `client_self` + portal `/portal/cases/:caseId`
- `addBillingEntryAction`에서 `bill_to_case_client_id`가 있고 해당 client가 portal 활성이면 알림 발송
- 패턴: `notifyDocumentStakeholders`와 동일 (`case_clients` 조회 → `is_portal_enabled=true` → insert)

### P0-2: 계약 서명 완료 시 직원 알림 (단계 7)

**추가할 것:**
- `NOTIFICATION_TYPES.CONTRACT_SIGNED_BY_CLIENT` 신규 정의
- policy: `org_managers_and_assigned` + internal `/cases/:caseId?tab=billing` 또는 `/contracts`
- `confirmPortalContractSignatureAction`에서 서명 완료 후 직원에게 알림 발송
- destination: `/contracts?agreementId=:id` 또는 `/cases/:caseId`

---

## 우선순위

1. **P0-1** 청구 → 의뢰인 알림 ✅ 수정 완료 (`1ae1bfe`)
2. **P0-2** 서명 → 직원 알림 ✅ 수정 완료 (`1ae1bfe`)

허브 비연동(단계 2)은 의도된 설계 — 기록용 사건은 허브 없이 운영. `createCaseAction`과 `createCaseHubAction`의 분리는 의도적. gap 아님.
