# Page Spec: Clients Roster (`/clients`)

> 작성: 2026-04-16
> 지위: 조직 **내부 운영용** 의뢰인 명단. 의뢰인 본인이 쓰는 포털(`/portal`)과
> **반드시 별도 쿼리 계층**을 쓴다 (리뷰어 5차 보안 hotfix 기준).
> 샘플 포맷: `docs/page-specs/notifications.md`

## 1. 목적
조직 구성원이 의뢰인·예비 의뢰인의 상태를 **운영 요약** 관점으로 조회.
- 의뢰인이 본인의 사건·메시지를 보는 **포털 뷰**와는 전혀 다른 쿼리 계층 사용
- 이 화면은 내부 roster: 사건 수·미납 건수·연결 상태·마스킹된 주민번호 등을 함께 표시

## 2. 기준 파일
1. Route SSoT: `src/lib/routes/registry.ts` (`ROUTES.CLIENTS`)
2. Navigation SSoT: `src/lib/routes/navigation-map.ts`
3. Interaction SSoT: `docs/interaction-matrix.clients.md` (예정)
4. Roster 쿼리 (**내부 전용**): `src/lib/queries/clients-roster.ts` (예정, 현재 `clients.ts#listClientPageRoster`에서 분리)
5. Portal 쿼리 (**의뢰인 전용, 최소권한**): `src/lib/queries/client-portal.ts` (예정)
6. Case-client 링크 맵: `src/lib/queries/clients.ts#getCaseClientLinkedMap`
7. 의뢰인 상세: `src/lib/queries/clients.ts#getClientDetailSummary`
8. Consistency check: `scripts/check-navigation-consistency.mjs`

## 3. 권한 조건
1. 인증 필수
2. 조직 구성원만 접근 (조직 미소속 시 `/start` 리다이렉트)
3. 의뢰인 본인(`is_client_account: true`) 접근 시 즉시 `/portal`로 리다이렉트
4. 플랫폼 관리자는 impersonation 세션으로만 다른 조직 roster 조회 가능
5. `has_permission('clients.read')` 체크

## 4. 노출 컴포넌트
1. 상단 검색바 (UnifiedListSearch)
2. "신규 의뢰인 추가" 버튼 → ClientAddModal
3. 의뢰인 변경 이력 (프로필) 링크
4. 의뢰인 변경 이력 (요청) 링크
5. CollapsibleList (의뢰인 카드 목록)
6. 의뢰인 카드 내: 이름·관계·연결 사건 수·미납 배지·연결 상태·마스킹된 주민번호
7. 초대 상세 카드 (invite 원본)
8. DangerActionButton — 명단에서 제거
9. 빈 상태 카드

## 5. 사용 데이터
1. `listClientPageRoster(organizationId)` — **roster 뷰 전용** (내부 운영 요약)
   - `case_clients`, `invitations`, `client_temp_credentials` 3개 출처 병합
2. `getClientDetailSummary(organizationId, clientKey)` — 선택된 의뢰인 상세
3. `getCasePickerOptions` — ClientAddModal용 사건 선택
4. `clientKey` 형식:
   - `caseclient-{id}` — 이미 연결된 case_clients 행
   - `invite-{id}` — 초대 상태
   - `profile-{id}` — 독립 프로필
5. `caseLinkStatus` 문자열 5종: 연결 완료 / 연결 해제 / 미연결 / 연결 해제 대기 / 복구 검토 중
6. `nextAction` 문자열: 초대 발송 / 상세 확인 / 복구 검토 / 해제 상태 확인
7. `overdueCount` (해당 의뢰인 사건에서 미납 건수)

## 6. 상태 정의

### 6.1 기본 상태
1. 상단에 의뢰인 추가 CTA + 검색
2. 각 카드에 이름·관계·배지 3종(연결 상태, 미납 여부, 복구 검토)
3. `overdueCount > 0`이면 amber 배지

### 6.2 로딩 상태
1. SSR 기본
2. 검색어 변경은 Next Link 네비게이션

### 6.3 빈 상태
1. 의뢰인 0명: "등록된 의뢰인이 없습니다." + 초대 CTA

### 6.4 오류 상태
1. 조회 실패 시 상단 배너 + 재시도
2. 카드별 에러는 카드 내부 배지

### 6.5 권한 없음 상태
1. 의뢰인 계정 진입 시 `/portal` 리다이렉트 (우회 금지)
2. 권한 없음이면 404

## 7. 버튼 및 상호작용

### 7.1 의뢰인 카드 본문 클릭
1. `${ROUTES.CLIENTS}/${item.clientKey ?? item.id}`로 이동
2. clientKey 경유로 detail view 열기

### 7.2 "프로필 변경 이력" / "요청 변경 이력" 링크
1. `${ROUTES.CLIENTS}/history?tab=profiles` / `?tab=requests`

### 7.3 의뢰인의 "사건 바로가기"
1. `${ROUTES.CASES}/${caseId}`로 이동

### 7.4 의뢰인의 "허브 바로가기"
1. `${ROUTES.CASE_HUBS}?caseId=${caseId}`로 이동

### 7.5 "의뢰인 추가" 버튼
1. ClientAddModal 열기 → 사건 선택 + 관계/이름 입력
2. 성공 시 roster 재조회 (revalidatePath)
3. 실패 시 인라인 에러

### 7.6 명단에서 제거
1. DangerActionButton (confirm modal)
2. 성공 toast + revalidatePath
3. Soft delete (link_status → unlinked), 하드 삭제는 관리자만

## 8. 토스트 규칙
1. 목록 조회 success toast 없음
2. 추가/제거는 success toast
3. 초대 발송 실패는 error toast (사용자 문구만)

## 9. 예외 처리 규칙
1. 임시 계정(temp_credential)은 카드에 "임시 계정" 배지 + 만료일
2. 초대 만료되면 "초대 재발송" CTA
3. 같은 의뢰인이 여러 사건 연결되면 카드에 사건 수 배지

## 10. 감사 로그
1. `client_list_view`
2. `client_added`
3. `client_removed`
4. `client_invitation_resent`

## 11. 접근성
1. 이름·관계·배지 순서로 읽히는 reading order
2. 마스킹된 주민번호는 스크린리더에 "민감정보 마스킹됨" 안내
3. 배지 색상만으로 상태 전달 금지

## 12. 완료 기준
1. 이 페이지는 **roster 뷰**만 사용. 포털 뷰 쿼리 호출 금지
2. 의뢰인 계정이 접근하면 `/portal` 리다이렉트
3. 모든 href가 `ROUTES.*` 경유
4. 의뢰인 배지(연결/미연결)는 `cases/page.tsx`·`case-hub-connect-button.tsx`와 동일 표현
5. `overdueCount` 계산은 `case-hub-projection.billing.overdueCount` 기준과 동일
6. 신규 CTA 추가 시 `interaction-matrix.clients.md`에 행 추가 후 UI
7. portal 데이터와 격리 — `clients-roster.ts`와 `client-portal.ts`의 테이블·필드가 섞이지 않음
