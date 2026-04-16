# 검증관 체크리스트 — 문서 생성 알림 (cdc29bc)

> 대상 커밋: `cdc29bc feat(notifications): 문서 생성 시 이해당사자 알림 자동 발생`
> 관련 정책: `src/lib/notification-policy.ts` (`DOCUMENT_CREATED`, `DOCUMENT_SHARED_WITH_CLIENT`)
> 관련 헬퍼: `src/lib/actions/case-actions.ts:notifyDocumentStakeholders`
> 자동 테스트 범위: unit(destination URL) + integration(insert 분기). **실환경 RLS·트리거·세션 동작은 이 체크리스트로만 커버.**

---

## 0. 사전 준비

### 0-1. Staging 시딩

```bash
VERIFICATION_SEED=1 \
NEXT_PUBLIC_SUPABASE_URL=<staging_url> \
SUPABASE_SERVICE_ROLE_KEY=<staging_service_role> \
VERIFICATION_SEED_PASSWORD=<16자 이상 랜덤> \
node scripts/seed-verification-personas.mjs > verification-personas.json
```

`verification-personas.json`에 6개 페르소나의 email/profileId가 담김. 비밀번호는 모두 `VERIFICATION_SEED_PASSWORD`와 동일.

### 0-2. 검증용 페르소나 (시드 출력 기준)

| 페르소나 | 이메일 | 역할 | 사건 연결 | 기대 동작 |
|---|---|---|---|---|
| **Staff A** (actor) | `verify+staff-a@veinspiral.test` | Org1 `org_manager` | handler (manager) | 본인 등록 문서는 **본인에게 알림 안 감** |
| **Staff B** | `verify+staff-b@veinspiral.test` | Org1 `org_manager` | handler 아님 | `DOCUMENT_CREATED` 수신 (manager니까) |
| **Staff C** | `verify+staff-c@veinspiral.test` | Org1 `org_staff` | handler (assistant) | `DOCUMENT_CREATED` 수신 (handler니까) |
| **Client D** | `verify+client-d@veinspiral.test` | 의뢰인, `is_client_account=true` | `case_clients`, `is_portal_enabled=true` | `client_visible` 문서만 `DOCUMENT_SHARED_WITH_CLIENT` 수신 |
| **Client E** | `verify+client-e@veinspiral.test` | 의뢰인, `is_client_account=true` | `case_clients`, `is_portal_enabled=false` | **알림 절대 수신 금지** (negative) |
| **Staff F** | `verify+staff-f@veinspiral.test` | Org2 `org_manager` | Org1 사건과 무관 | **알림 절대 수신 금지** (isolation) |

**공용 사건:** `검증용 사건 · 문서 알림 시나리오` (ref `VERIFY-DOC-NOTIF-001`, Org1 소유)

---

## 1. 시나리오 A — `client_visible` 문서 등록

### 1-1. 실행 단계 (Staff A 세션)
1. Staff A로 staging에 로그인
2. 사건 목록 → `검증용 사건 · 문서 알림 시나리오` 진입 → 문서 탭
3. 새 문서 등록:
   - 제목: `검증 A · client_visible`
   - 유형: 아무 것 (`brief` 등)
   - **공개 범위: `client_visible`** (핵심)
   - 내용: 짧은 요약
   - 제출
4. 등록 완료 토스트 확인

### 1-2. 기대 결과

| 체크 | 확인 방법 | 기대값 |
|---|---|---|
| [ ] Staff A에게 알림이 가지 않음 | Staff A 알림 센터 새로고침 | 새 row 없음 |
| [ ] Staff B에게 `DOCUMENT_CREATED` 알림 | Staff B 로그인 → `/notifications` | "새 문서가 등록됐습니다 · 검증 A..." 카드, `destination_url=/cases/:caseId?tab=documents` |
| [ ] Staff C에게 `DOCUMENT_CREATED` 알림 | Staff C 로그인 → `/notifications` | 동일 카드 표시 |
| [ ] Client D에게 `DOCUMENT_SHARED_WITH_CLIENT` 알림 | Client D 로그인 → `/portal/notifications` | "새 문서가 공유됐습니다 · 검증 A..." 카드, `destination_url=/portal/cases/:caseId` |
| [ ] Client E에게 **알림 없음** | Client E 로그인 → `/portal/notifications` | 새 row 없음 (portal off) |
| [ ] Staff F에게 **알림 없음** | Staff F 로그인 → `/notifications` | 새 row 없음 (격리) |

### 1-3. destination 링크 착륙 검증

| 체크 | 단계 | 기대 |
|---|---|---|
| [ ] Staff B의 알림 CTA 클릭 | B가 알림 카드 → "문서 타임라인 열기" | `/cases/:caseId?tab=documents`로 이동 + 방금 등록한 문서가 "기존 문서" 타임라인 상단에 표시 |
| [ ] Client D의 알림 CTA 클릭 | D가 알림 카드 → "포털에서 열기" | `/portal/cases/:caseId`로 이동 + "공유 문서" 섹션 타임라인 상단에 표시 |

---

## 2. 시나리오 B — `internal_only` 문서 등록

### 2-1. 실행 단계 (Staff A 세션)
1. Staff A로 같은 사건 문서 탭 재진입
2. 새 문서 등록:
   - 제목: `검증 B · internal_only`
   - **공개 범위: `internal_only`**
   - 제출

### 2-2. 기대 결과

| 체크 | 확인 | 기대값 |
|---|---|---|
| [ ] Staff B·C에게 `DOCUMENT_CREATED` 알림 | 알림 센터 | 수신됨 |
| [ ] Client D에게 **알림 없음** | `/portal/notifications` | 수신 금지 (internal) |
| [ ] Client E·Staff F 알림 없음 | 각자 알림 센터 | 수신 금지 |
| [ ] Client D가 `/portal/cases/:caseId` 방문 시 해당 문서 **비노출** | 포털 "공유 문서" 섹션 | 시나리오 A에서 등록한 문서는 보이되, 방금 `internal_only`는 안 보임 |

---

## 3. 시나리오 C — 협업 조직 확장 시 (선택, 조직간 협업 확인)

현재 Org2는 Org1 사건에 연결되지 않은 상태(isolation). 만약 협업 알림을 검증하려면 검증관이 UI에서 Org2를 협업 조직으로 추가한 뒤 시나리오 A를 재실행. 이 경우 Staff F도 `DOCUMENT_CREATED`를 받아야 함.

> 주의: 현재 `notifyDocumentStakeholders`는 `organization_memberships` + `case_handlers` + `case_clients`만 조회한다. **협업 조직 매니저는 `case_organizations` → `organization_memberships` 연쇄가 아니라, 본인 조직의 `organization_memberships` row만 매칭된다.** 즉 Org2를 단순 `case_organizations`로 붙이는 것만으로는 Staff F에게 알림이 가지 **않음**. 이는 현재 정책의 의도된 동작이며, 필요 시 별도 후속 스프린트.

시나리오 C는 **현재 동작 확인용** (협업 조직 추가 후 Staff F가 여전히 알림을 받지 않는 걸 확인).

---

## 4. 결과 기록

체크리스트 모두 완료 후 결과를 `docs/VERIFICATION_RESULT_document_notifications_<날짜>.md`로 남기거나, 문제가 생기면 해당 시나리오 번호 + 실제값 + 기대값 + DB 증거(스크린샷 또는 raw row)를 공유.

---

## 5. 검증 종료 후 teardown

```bash
VERIFICATION_SEED=1 \
NEXT_PUBLIC_SUPABASE_URL=<staging_url> \
SUPABASE_SERVICE_ROLE_KEY=<staging_service_role> \
node scripts/teardown-verification-personas.mjs
```

사건·링크는 soft-delete 처리, 페르소나 profiles/auth.users는 유지 (다음 검증 라운드에서 재사용).

---

## 6. 알려진 제약

- 스크립트는 UI 세션이 아니라 DB 직접 시딩이므로, Supabase Auth 로그인 링크·카카오 OAuth 없이도 이메일/비밀번호로 로그인 가능 (email_confirm=true).
- 시드 페르소나는 실제 업무 계정과 도메인이 다름 (`@veinspiral.test`) — 실 데이터와 혼동 금지.
- `case_documents`에 쌓인 테스트 문서는 teardown 시 자동 정리되지 않음. 검증 후 필요 시 직접 soft-delete.
