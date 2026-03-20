# Vein Spiral P0-P6 Full Foundation

이 코드베이스는 다음 범위를 통합 반영한 기반 버전입니다.

1. P0-01 다중 조직 사건 모델
2. P0-02 조직 개설 신청/승인
3. P0-03 직원/의뢰인 초대 링크
4. P0-04 권한 템플릿 + 예외 권한
5. P0-05A Client Billing
6. P0-05B Collection Compensation
7. P0-05C Inter-Org Settlement
8. P0-06 공통 Case Shell 재배치

## 핵심 원칙

1. 모든 사건은 공통 Case Shell을 사용합니다.
2. Billing은 모든 사건의 공통 기본 기능입니다.
3. Collection은 추심 사건에서만 켜지는 선택 모듈이며, 동시에 별도 Workspace를 가집니다.
4. 추심 보수 약정은 의뢰인 Billing이 아니라 Collections 내부 성과/보수 도메인입니다.
5. 조직은 법인의 하위부서가 아니라, 독립 운영 단위입니다.

## 적용 순서

기존 프로젝트가 0001~0008까지 적용돼 있다면 아래만 추가 적용합니다.

- 0009_p0_01_multiorg_case_foundation.sql
- 0010_p0_02_org_signup_governance.sql
- 0011_p0_03_invitation_rework.sql
- 0012_p0_04_permission_templates.sql
- 0013_p0_05_financial_domains.sql
- 0014_p0_06_case_shell_scaffold.sql
- 0015_hotfix_security_and_portal_rls.sql
- 0016_dynamic_configuration_foundation.sql
- 0017_dynamic_configuration_seed_catalog.sql
- 0018_schema_sync_organization_signup_requests.sql
- 0019_client_access_requests.sql
- 0020_org_signup_document_verification.sql
- 0021_refresh_landing_hero_copy.sql
- 0022_client_account_onboarding.sql
- 0023_platform_admin_security_controls.sql
- 0024_virtual_organization_registry.sql
- 0025_platform_admin_scenario_controls_and_legal_identity.sql
- 0026_notification_center_upgrade.sql

새 프로젝트라면 0001부터 0026까지 순서대로 적용합니다.

## 운영 메모

- 사용자 프로필, 실명, 플랫폼 관리자 시나리오 접근 흐름을 변경할 때는 `0025_platform_admin_scenario_controls_and_legal_identity.sql` 적용 여부를 반드시 함께 확인합니다.
- `profiles.legal_name`, `profiles.legal_name_confirmed_at`, `platform_admin_scenario_controls`를 전제로 한 변경은 0025가 빠진 환경에서 런타임 오류를 낼 수 있습니다.
- 플랫폼 관리자 구조는 현재 전용 security/scenario/virtual organization 레이어를 포함합니다. 후속 정리 방향은 `docs/platform-organization-consolidation-plan.md`의 고정 플랫폼 조직 모델을 기준으로 검토합니다.

## 실행

```bash
pnpm install
pnpm check:migrations
pnpm dev
```

## UX Reference

- 액션 설계 체크리스트: `docs/ux-action-checklist.md`

## CI

- `pnpm check:all`은 마이그레이션 번호 검증, lint, typecheck, test, build를 한 번에 실행합니다.
- `pnpm test`는 공통 권한 가드 같은 순수 로직을 빠르게 검증합니다.
- `pnpm test:e2e:public-smoke`는 `next dev` 기준의 빠른 공개 경로 smoke입니다.
- `pnpm test:e2e:prod-smoke`는 `build + next start` 기준의 공개 경로 production smoke입니다.
- `pnpm test:e2e:auth-prod-smoke`는 seeded 계정으로 세션을 주입한 뒤 보호 경로와 제한된 알림 상호작용을 확인하는 authenticated production smoke입니다.
- GitHub Actions는 pull request와 `main` push에서 검증을 강제하고, authenticated production smoke는 `main` push 또는 수동 실행에서만 별도 gate로 돌립니다.

## Release Smoke Policy

- release 직전 smoke 순서는 고정합니다: `pnpm check:all` → `pnpm test:e2e:public-smoke` → `pnpm test:e2e:prod-smoke` → `pnpm test:e2e:auth-prod-smoke`
- `public-smoke`는 개발 확인용입니다. 로컬 변경 직후 빠르게 돌려 앱 부팅과 공개 라우팅 생존만 확인합니다.
- `prod-smoke`는 공개 경로 production smoke입니다. `build + next start` 기준으로 공개 엔트리와 헬스체크를 확인합니다.
- `auth-prod-smoke`는 release gate 전용입니다. seeded 세션으로 보호 라우트를 확인하고, service role로 격리된 테스트용 알림을 생성한 뒤 즉시 정리하는 제한된 상호작용만 허용합니다.
- PR 상시 CI는 `e2e-smoke`와 `e2e-production-smoke`까지만 포함합니다. authenticated smoke는 운영 의존성이 있으므로 `main` push 또는 수동 실행에서만 허용합니다.

## Authenticated Smoke Standard

- 기준 계정 secret 이름은 `E2E_AUTH_SMOKE_EMAIL`로 고정합니다.
- 이 secret은 사람 계정이 아니라 release gate 전용 seeded `platform_support` 계정을 가리켜야 합니다.
- `SUPABASE_SERVICE_ROLE_KEY`가 설정된 환경에서는 `E2E_AUTH_SMOKE_EMAIL`이 비어 있어도 active `platform_support` 계정을 자동 탐색합니다. 다만 CI와 release gate에서는 계정 고정을 위해 명시 설정을 권장합니다.
- 기준 계정은 활성 상태여야 하고, 기본 조직이 연결돼 있어 `/dashboard`와 `/notifications`를 모두 정상 렌더할 수 있어야 합니다.
- 기준 보호 경로는 `/notifications`로 고정합니다.
- 기준 홈 경로는 `/dashboard`로 고정합니다.
- `/dashboard`와 `/notifications`를 기준 경로로 고정하는 이유는 세션 성립, 공통 보호 레이아웃, 서버 렌더, 조직 문맥, 핵심 읽기 UI를 가장 얇고 안정적으로 함께 확인할 수 있기 때문입니다.
- 기준 확인 문구는 홈 `오늘 바로 움직일 것들`, 보호 경로 `알림 정리함`으로 고정합니다.
- authenticated smoke는 로그인 성공, `/dashboard` 진입, `/notifications` 렌더, 공통 로그아웃 버튼 존재를 기준으로 하되 현재는 조직 업무 허브 주요 읽기 화면까지 함께 확인합니다.
- authenticated smoke는 read-heavy 원칙을 유지합니다. 다만 release gate 안정성을 위해 service role로 seeded notification을 생성하고 읽음 처리 후 정리하는 제한된 검증은 허용합니다.

## Authenticated Smoke Env

- `E2E_AUTH_SMOKE_EMAIL`: release gate 전용 seeded `platform_support` 계정 이메일. 비어 있으면 service role 기준 자동 탐색 시도
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: 권장. admin-generated OTP로 seeded session을 만들 때 사용
- `E2E_AUTH_SMOKE_PASSWORD`: 선택. service role이 없을 때만 password sign-in fallback으로 사용
- 경로와 heading 기준은 코드에 고정돼 있으므로 별도 CI variable로 바꾸지 않습니다.

## Ops Fixed Commands

- `.env.local` 로드 고정 실행: `./scripts/run-with-env.sh <command>`
- 환경 사전 점검: `pnpm ops:preflight`
- Supabase 프로젝트 확인: `pnpm supabase:projects`
- Supabase 마이그레이션 목록: `pnpm supabase:migration:list`
- Supabase DB 반영: `pnpm supabase:db:push`
- 메인 동기화(직반영 시작 전): `pnpm git:main:sync`

주의:
- Supabase CLI는 `SUPABASE_SERVICE_ROLE_KEY`가 아니라 `SUPABASE_ACCESS_TOKEN`을 사용합니다.
- 마이그레이션 적용에는 `SUPABASE_DB_PASSWORD`도 필요합니다.

## 추가 의존성

- `xlsx`
- `docx`
- `pdf-lib`

이 버전에서는 캘린더, 사건현황판, Collections, Billing, Reports의 내보내기 API 스캐폴딩도 포함합니다.
