# System Map

## 1) 페이지 목록
| 페이지명 | 경로 | 목적 | 접근권한 | 관련 컴포넌트 |
|---|---|---|---|---|
| 랜딩 | `/` | 서비스 소개 및 진입 | 전체 | `src/app/page.tsx` |
| 로그인 | `/login` | 인증 시작 | 전체 | `src/app/login/page.tsx` |
| 대시보드 | `/dashboard` | 업무 홈 | 인증 사용자 | `src/app/(app)/dashboard/page.tsx` |
| 알림 | `/notifications` | 알림 처리 | 인증 사용자 | `src/app/(app)/notifications/page.tsx` |
| 사건 | `/cases` | 사건 목록/진입 | 인증 사용자 | `src/app/(app)/cases/page.tsx` |
| 설정 | `/settings` | 설정 허브 | 인증 사용자 | `src/app/(app)/settings/page.tsx` |

## 2) 컴포넌트 목록
| 컴포넌트명 | 사용 페이지 | 주요 props | 클릭 이벤트 | 의존 스키마/데이터 |
|---|---|---|---|---|
| `BrandBanner` | 랜딩, 앱 레이아웃 | `href`, `theme` | 로고 클릭 이동 | 라우트 상수 |
| `SettingsNav` | 설정 페이지 | `currentPath` 등 | 탭 이동 | `NAVIGATION_MAP` |
| `PageBackButton` | 앱 레이아웃 | `fallbackHref`, `topLevelRoutes` | 뒤로가기/대체 이동 | `ROUTES` |

## 3) 인터랙션 목록
| 트리거 | 조건 | 결과 | 실패 처리 | 관련 파일 |
|---|---|---|---|---|
| 랜딩 시작하기 클릭 | 인증 여부 | 인증 시 기본 앱 경로, 비인증 시 `/start` | 없음 | `src/app/page.tsx` |
| 로그인 상태 진입 | 이미 인증됨 + 에러 없음 | 역할별 홈으로 redirect | 에러 파라미터 시 페이지 노출 | `src/app/login/page.tsx` |
| 설정 메뉴 클릭 | 관리자/플랫폼 조건 충족 | 해당 설정 페이지 이동 | 권한 없으면 토스트 표시 | `src/components/settings-nav.tsx` |

## 4) 스키마/정책 분류표
| 이름 | 역할 | 사용 위치 | 수정 권한 | 연결 컴포넌트 |
|---|---|---|---|---|
| `ROUTES` | 라우팅 기준 | `src/lib/routes/registry.ts` | FE 공통 | 전역 링크 |
| `NAVIGATION_MAP` | UI 요소별 이동 맵 | `src/lib/routes/navigation-map.ts` | FE 공통 | 랜딩/로그인/설정 |
| `app-entry-policy` | 인증 후 상태 전이 정책 | `src/lib/app-entry-policy.ts` | FE/BE 협업 | 앱 레이아웃 진입 |

## 5) 운영 원칙
- 라우트 문자열은 신규 코드에서 직접 하드코딩하지 않고 `ROUTES`를 우선 사용한다.
- UI 이벤트별 링크는 가능하면 `NAVIGATION_MAP` 식별자로 연결한다.
- 상태 전이(로그인 전/후, 권한 없음, 데이터 없음, 에러)는 page spec 문서와 정책 코드 양쪽에 반영한다.
