# Page Spec: Login (`/login`)

## 목적
- 계정 인증 진입점을 제공하고, 이미 인증된 사용자는 즉시 홈으로 보낸다.

## 노출 컴포넌트
- `CredentialLoginForm`
- `LoginButton`(카카오)
- 보조 링크(회원가입/조직개설/지원)

## 사용 데이터
- `getCurrentAuth()`
- `getAuthenticatedHomePath()`
- `searchParams.error`

## 클릭 이벤트
- 바로 이동: 역할별 홈
- 대시보드 보기: `/dashboard`
- 일반 회원가입: `/start/signup`
- 조직 개설 신청: `/organization-request`
- 지원: `/support`

## 예외 상태
- 인증 조회 실패: 로그인 폼 표시 유지
- `error` 파라미터 존재: 인라인 에러 표시

## 권한 조건
- 전체 공개 페이지
- 인증 사용자 진입 시 redirect 우선

## 완료 기준
- 고정 링크가 `NAVIGATION_MAP` 기준으로 관리된다.
- 인증 분기/오류 분기 동작이 문서와 구현에서 일치한다.
