# Interaction Matrix

| 트리거 | 조건 | 결과 | 실패 시 | 로그 수집 | 파일 |
|---|---|---|---|---|---|
| 홈 시작하기 버튼 클릭 | 인증 사용자 | `getDefaultAppRoute(auth)` 이동 | 경로 미정의 시 `ROUTES.START` fallback | `TODO` | `src/app/page.tsx` |
| 홈 시작하기 버튼 클릭 | 비인증 사용자 | `/start` 이동 | 없음 | `TODO` | `src/app/page.tsx` |
| 로그인 페이지 진입 | 인증됨 + 에러 파라미터 없음 | 역할별 홈으로 redirect | 인증 조회 오류 시 로그인 폼 노출 | `TODO` | `src/app/login/page.tsx` |
| 설정 메뉴 클릭 | 관리자 권한 없음 | 이동 차단 + 안내 토스트 | 링크 이동 금지 | `TODO` | `src/components/settings-nav.tsx` |

## 점검 체크리스트
- 각 행의 결과 경로가 `src/lib/routes/registry.ts`에 존재하는가?
- 각 행의 UI 클릭 소스가 `src/lib/routes/navigation-map.ts`로 연결되는가?
- 실패 시 동작(비활성/오류 메시지/대체 이동)이 코드에 명시되어 있는가?
