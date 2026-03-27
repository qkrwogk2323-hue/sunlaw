# Page Spec: App Shell (`/(app)`)

## 목적
- 인증 사용자 공통 레이아웃과 진입 정책을 적용한다.

## 노출 컴포넌트
- `NavBadgesAsync`
- `BrandBanner`
- `PageBackButton`
- `GlobalCommandPalette`

## 사용 데이터
- `requireAuthenticatedUser()`
- `enforceAppEntryPolicy()`
- `getDefaultAppRoute()`
- `getTopLevelAppRoutes()`

## 클릭 이벤트
- 브랜드 클릭: 기본 앱 경로
- 뒤로가기 버튼: fallback 또는 이전 경로

## 예외 상태
- 지원 세션 활성: 경고 배너 + 세션 종료 버튼
- 구독 잠금 상태: 잠금 안내 배너

## 권한 조건
- 인증 필수
- 상태 전이 정책 적용:
  - 비밀번호 변경 필요
  - 프로필 입력 필요
  - 실명 입력 필요
  - 의뢰인 승인 대기
  - 의뢰인 활성 포털 이동
  - 조직 미가입

## 완료 기준
- 상태 전이 경로가 `ROUTES` 기준을 사용한다.
- 상태 전이 규칙이 문서와 `app-entry-policy` 구현에서 일치한다.
