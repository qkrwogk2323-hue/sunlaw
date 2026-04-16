# Page Spec: Notifications (`/notifications`)

> 작성: 2026-04-16
> 지위: 리뷰어 권고로 신설된 **page-spec 확장 샘플**. 이후 모든 페이지는 이 포맷을 따른다.

## 1. 목적
인증 사용자가 자신에게 도달한 알림을 확인, 처리, 보관할 수 있는 단일 처리 화면이다.
대시보드는 요약만 담당하고, 실제 상태 변경은 이 화면에서 수행한다.

## 2. 기준 파일
1. Route source of truth: `src/lib/routes/registry.ts`
2. Navigation source of truth: `src/lib/routes/navigation-map.ts`
3. Interaction source of truth: `docs/interaction-matrix.md`
4. UI contract key source: `src/lib/interactions/registry.ts`
5. Consistency check: `scripts/check-navigation-consistency.mjs`

## 3. 권한 조건
1. 인증 필수
2. 알림 목록은 현재 사용자에게 귀속된 항목만 조회
3. 권한 없는 알림 상세 또는 연결 객체는 직접 노출하지 않음
4. 이미 처리된 알림도 보관함에서 재조회 가능

## 4. 노출 컴포넌트
1. `NotificationsArchiveButton`
2. 알림 요약 카드
3. 알림 행 리스트
4. 상태 필터
5. 비어 있음 안내
6. 오류 안내 배너

## 5. 사용 데이터
1. `notifications feed`
2. `unreadCount`
3. `archivedCount`
4. 행별 `interaction_key`
5. 연결 대상 route 정보
6. 연결 대상 존재 여부
7. 사용자 권한 범위

## 6. 상태 정의
### 6.1 기본 상태
1. 읽지 않음/처리 필요 알림이 최신순으로 보인다
2. 각 행은 제목, 요약, 생성 시각, 상태 배지, CTA를 가진다
3. 보관함 버튼에는 `archivedCount` 배지가 붙는다

### 6.2 로딩 상태
1. 최초 진입 시 skeleton 표시
2. 버튼은 skeleton 동안 클릭 불가
3. skeleton은 실제 행 구조와 동일한 폭을 유지

### 6.3 빈 상태
1. 현재 필터 결과가 0건이면 빈 상태 카드 노출
2. 문구 예시: `표시할 알림이 없습니다.`
3. 보관함에만 데이터가 있으면 보관함 버튼은 계속 노출

### 6.4 오류 상태
1. feed 조회 실패 시 리스트 대신 오류 배너 표시
2. 문구 예시: `알림을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.`
3. 새로고침 CTA 제공
4. raw error, JSON, stack trace 노출 금지

### 6.5 권한 없음 상태
1. 인증이 없으면 `/login`으로 이동
2. 연결 객체가 권한 범위를 벗어나면 해당 행 CTA는 비활성 또는 대체 이동
3. 사용자 문구 예시: `접근 권한이 없는 항목입니다.`

## 7. 버튼 및 상호작용
### 7.1 보관함 토글 버튼
1. 위치: 우상단
2. interaction_key: `NOTIFICATIONS_ARCHIVE_LIST`
3. 동작: 보관함 팝오버 열기/닫기
4. 보관함 전체 보기 링크는 registry를 통해 `/notifications?state=archived`로 이동
5. 직접 href 하드코딩 금지

### 7.2 알림 행 열기
1. interaction_key가 존재할 때만 클릭 허용
2. navigate 또는 mixed 유형은 registry 기준으로 이동
3. 링크 대상이 없으면 버튼 대신 disabled 표시

### 7.3 읽음 처리
1. 고빈도 액션이므로 성공 toast 금지
2. 행 스타일만 즉시 갱신
3. 실패 시만 error toast
4. 문구 예시: `읽음 처리에 실패했습니다.`

### 7.4 해결 처리
1. workflow 상태를 바꾸는 행위이므로 success toast 허용
2. 문구 예시: `알림을 처리 완료로 변경했습니다.`
3. 실패 시 error toast
4. 문구 예시: `알림 상태를 변경하지 못했습니다.`

### 7.5 보관 처리
1. success toast는 1회만 허용
2. 문구 예시: `알림을 보관함으로 이동했습니다.`
3. undo가 없으면 destructive confirm은 생략 가능
4. 실패 시 error toast
5. 문구 예시: `보관 처리에 실패했습니다.`

## 8. 토스트 규칙
1. 조회 성공 toast 금지
2. 자동 새로고침 toast 금지
3. 읽음 처리처럼 고빈도·저위험 액션은 success toast 금지
4. 상태 변경이 업무 흐름을 바꾸는 경우만 success toast 허용
5. 에러 toast는 사용자 문구만 노출
6. 동일 이벤트 중복 toast 금지

## 9. 예외 처리 규칙
1. validation error는 토스트가 아니라 인라인 또는 행 단위 문구
2. permission error는 우선 비활성 또는 대체 이동
3. 서버 5xx는 공통 에러 toast
4. 네트워크 재시도는 수동 refresh CTA 우선

## 10. 감사 로그
1. `open`
2. `mark_read`
3. `resolve`
4. `archive`
각 action은 최소 `interaction_key`, `actor_id`, `notification_id`, `timestamp`를 남긴다.

## 11. 접근성
1. 버튼/링크 모두 `aria-label` 부여
2. badge 숫자는 스크린리더가 읽을 수 있어야 함
3. keyboard navigation 가능해야 함
4. focus ring 제거 금지

## 12. 완료 기준
1. 모든 CTA가 `ROUTES` 또는 `NAVIGATION_MAP`을 직접 또는 registry 경유로 사용한다
2. 보관함 CTA는 `resolveInteractionHref`와 `data-interaction-key`를 사용한다
3. 직접 `router.push('/notifications?...')` 금지
4. 성공/실패 토스트 규칙이 문서와 구현에서 일치한다
5. unreadCount, archivedCount, 리스트 상태가 같은 feed를 기준으로 계산된다
