# CI Secrets 요구사항

> 지시서 DIRECTIVE_RESOLVE_CHAOS.md 4.4 / 4.1 — live 인증 및 보안 E2E 검증을
> 위해 GitHub Actions에 등록할 secrets 목록과 등록 방법.

## 등록 위치
GitHub Repo → Settings → Secrets and variables → Actions → New repository secret.

## 필수 secrets (job별 분류)

### 1. `live-integration` job (DB-backed 통합 테스트)
| Secret 이름 | 용도 | 어디서 얻나 |
|---|---|---|
| `SUPABASE_URL` | 원격 Supabase REST URL | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_URL` | (중복) Next.js 클라이언트도 사용 | 위와 동일 값 |
| `SUPABASE_SERVICE_ROLE_KEY` | RLS 우회 admin 작업 (테스트 격리, integration test seed) | API → service_role key |
| `SUPABASE_TEST_ORG_ID` | rollback 통합 테스트가 사용할 dedicated test 조직 UUID | seed 시드 후 메모 (조직 A의 id) |
| `SUPABASE_TEST_ACTOR_ID` | (선택) 성공 경로 검증용 valid actor UUID | seed 시드 후 메모 |
| `SUPABASE_ACCESS_TOKEN` | `supabase gen types` CLI 인증 | https://supabase.com/dashboard/account/tokens |
| `SUPABASE_PROJECT_ID` | gen types 대상 project ref | Project Settings → Reference ID |

### 2. `e2e-authenticated-production-smoke` job (기존, 인증 prod 스모크)
| Secret 이름 | 용도 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | (위와 공유) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 클라이언트 SDK용 anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | (위와 공유) |
| `E2E_AUTH_SMOKE_EMAIL` | 인증 스모크용 사전 등록 사용자 이메일 |
| `E2E_AUTH_SMOKE_PASSWORD` | 위 사용자 비밀번호 |

### 3. `e2e-security-boundary` job (도입 완료 — 보안 경계 E2E, 9 시나리오)
| Secret 이름 | 용도 |
|---|---|
| `SUPABASE_URL` | (공유) |
| `NEXT_PUBLIC_SUPABASE_URL` | (공유) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (공유) |
| `SUPABASE_SERVICE_ROLE_KEY` | seed 사건 3건 생성 + teardown |
| `E2E_SEED_USER_MANAGER_EMAIL` | u_org_a_manager 이메일 |
| `E2E_SEED_USER_ASSIGNED_EMAIL` | u_org_a_assigned 이메일 |
| `E2E_SEED_USER_UNASSIGNED_EMAIL` | u_org_a_unassigned 이메일 |
| `E2E_SEED_USER_OTHERORG_EMAIL` | u_org_b_member 이메일 |
| `E2E_SEED_USER_CLIENT_EMAIL` | 의뢰인 사용자 이메일 |
| `E2E_SEED_USER_PASSWORD` | 위 5명 공통 패스워드 (테스트 전용) |
| `E2E_SEED_USER_MANAGER_PROFILE_ID` | manager profile UUID (seed 스크립트로 발급) |
| `E2E_SEED_USER_ASSIGNED_PROFILE_ID` | assigned profile UUID |

### 4. `live-auth-integration` job (예정 — rate_limit_buckets 실 DB 검증)
| Secret 이름 | 용도 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | (공유) |
| `SUPABASE_SERVICE_ROLE_KEY` | rate_limit_buckets 직접 read/write 검증 |
| `LIVE_AUTH_TEST_BASE_URL` | dev 서버 또는 staging URL (`https://staging.veinspiral.com`) |

## 등록 예시 — Supabase 키 발급 절차

1. https://supabase.com/dashboard/project/{project_ref}/settings/api 접속
2. **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL`
3. **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **service_role secret** key → `SUPABASE_SERVICE_ROLE_KEY` (절대 클라이언트에 노출 금지)

## 등록 예시 — Personal Access Token 발급

1. https://supabase.com/dashboard/account/tokens 접속
2. **Generate new token** → 이름 `veinspiral-ci`, 기간 90일 권장
3. 발급된 토큰 → `SUPABASE_ACCESS_TOKEN`

## 로컬 개발에서 동일하게 쓰려면

`.env.local` (gitignored)에 위 secret과 동일한 키-값을 넣고 `pnpm dev` / `pnpm test` /
`pnpm types:check` 실행. CI와 로컬이 동일 검증을 수행하게 됨.

## 보안 원칙

1. service_role key는 **CI secrets와 .env.local에만** 보관. 절대 코드/로그/Slack 노출 금지.
2. CI에서 secret이 누락되면 해당 job은 graceful skip (현재 코드 기준)
   — 즉 fork PR에서도 빌드 실패 없음. 단, main 머지 전엔 secret 세팅된 환경에서 검증돼야 함.
3. test 사용자 패스워드는 prod 사용자와 절대 공유 금지. 무작위 32자 권장.
4. 토큰 만료 90일마다 회전 (`SUPABASE_ACCESS_TOKEN`).

## 점검 체크리스트 (운영자용)

- [ ] `SUPABASE_URL` 등록
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 등록
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 등록
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 등록
- [ ] `SUPABASE_ACCESS_TOKEN` 등록
- [ ] `SUPABASE_PROJECT_ID` = `hyfdebinoirtluwpfmqx` 등록
- [ ] `E2E_AUTH_SMOKE_EMAIL` / `E2E_AUTH_SMOKE_PASSWORD` 등록
- [ ] (E2E 보안 경계 도입 시) `E2E_SEED_*` 7건 등록
- [ ] (rollback test 도입 시) `SUPABASE_TEST_ORG_ID` / `SUPABASE_TEST_ACTOR_ID` 등록
- [ ] CI에서 graceful skip 동작 확인 (secret 미설정 시 PR 통과 가능)
- [ ] secret 등록 후 main 머지 시 모든 secret-gated job 통과 확인
