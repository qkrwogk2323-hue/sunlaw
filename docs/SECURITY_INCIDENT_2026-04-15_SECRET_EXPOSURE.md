# 보안 인시던트 — Secret 평문 노출 (2026-04-15)

## 분류
- 심각도: **HIGH** (production secret 다수 평문 노출)
- 노출 범위: Claude CLI 세션 로그 + 로컬 shell history + 프로세스 테이블
- 노출 시점: 2026-04-14 18:00 ~ 2026-04-15 11:40 (약 18시간)

## 노출된 Secret 목록

### 확정 노출 (shell 명령 인자로 평문)
| Secret | 과거 값 prefix | 출처 |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | `sbp_1747d485...` | 다수의 `curl -H "Authorization: Bearer sbp_..."` 명령 |
| `SUPABASE_DB_PASSWORD` | `80Uqj4zM...` | `PGPASSWORD='80Uqj4...' psql ...` 명령 다수 |

### 확정 노출 (파일 덤프로 전체 노출)
`.env.local` 파일이 `cat` / `grep` / `Read` 도구로 전체 노출됨 (세션 내 1회 이상). 아래 전 항목이 conversation log에 기록됨:

| Secret | prefix | rotation 우선순위 |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `sJoRe...` (JWT) | P0 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `84mdc...` (JWT) | P1 (공개 가능하나 JWT secret 로테이션 시 함께 갱신) |
| `PII_ENCRYPTION_KEY_BASE64` | `eB5dq2HSef...` | **P0 — 기암호화 데이터 재마이그레이션 필수** |
| `SUPPORT_IMPERSONATION_COOKIE_SECRET` | `e78e8558...` | P0 |
| `GEMINI_API_KEY` | `AIzaSyCD93...` | P1 |
| `KAKAO_CLIENT_SECRET` | `ct8LbgEk...` | P1 |
| `VERCEL_OIDC_TOKEN` | `eyJhbGci...` | P3 (자동 만료·재발급) |

### Branch DB credentials (이미 삭제된 branch들)
- `test-1real-fn`, `test-secdef`, `test-multi-stmt`, `test-string-lit`, `test-long-body`, `test-real-chunk1`, `fresh-squash-v1~v8` 등 ~12개 branch DB password가 API 응답에 포함되어 로그 노출. 해당 branch 모두 삭제됨 (rotation 이슈 해소).

## Rotation 절차

### P0 즉시 실행 (운영 영향 주의)

#### 1. Supabase PAT
- https://supabase.com/dashboard/account/tokens
- 기존 `veinspiral-ci` 토큰 **Revoke**
- 새 토큰 발급 (기간 90일, 이름 `veinspiral-ci-2026-04-15`)
- CI secret `SUPABASE_ACCESS_TOKEN` 갱신
- 로컬 `.env.local`의 `SUPABASE_ACCESS_TOKEN` 갱신

#### 2. Supabase DB Password
- Dashboard → Project `hyfdebinoirtluwpfmqx` → Settings → Database
- **Reset database password** → 생성된 비밀번호 안전 복사
- CI secret `SUPABASE_DB_PASSWORD` 갱신
- 로컬 `.env.local`의 `SUPABASE_DB_PASSWORD` 갱신

#### 3. Supabase JWT Secret (service_role + anon 동시 회전)
- Dashboard → Settings → API → **JWT Settings** → **Regenerate secret**
- ⚠️ **영향**: 기존 발급된 모든 JWT(사용자 세션, anon 토큰)가 즉시 무효화됨. 전체 사용자 재로그인 필요.
- 새 `anon` + `service_role` 키 복사
- CI secrets 갱신:
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Vercel env 갱신 (production + preview)
- 로컬 `.env.local` 갱신

#### 4. PII_ENCRYPTION_KEY_BASE64 (복잡 — 데이터 재암호화 필요)
현재 암호화 컬럼:
- `case_party_private_profiles.resident_number_ciphertext`
- `case_party_private_profiles.registration_number_ciphertext`
- `case_party_private_profiles.address_detail_ciphertext`
- 기타 `*_ciphertext` 컬럼

**권장 절차**:
1. 새 키 생성: `openssl rand -base64 32`
2. 애플리케이션에 **dual-key** 지원 추가 (decrypt: 둘 다 시도, encrypt: 새 키)
3. 배포 후 백그라운드 작업으로 기존 ciphertext를 새 키로 재암호화 (원본 복호화 → 새 키 암호화)
4. 모든 row 마이그레이션 완료 후 구 키 제거
5. .env.local + CI secret `PII_ENCRYPTION_KEY_BASE64` 신규 값으로 교체

### P1 실행

#### 5. SUPPORT_IMPERSONATION_COOKIE_SECRET
- 새 값 생성: `openssl rand -hex 32`
- CI + .env.local 갱신
- 영향: 기존 impersonation 세션 모두 무효화

#### 6. Gemini API Key
- https://aistudio.google.com/app/apikey
- 기존 키 Delete → 새 키 Create
- CI + .env.local 갱신

#### 7. Kakao Client Secret
- https://developers.kakao.com/console/app/{APP_ID}/config
- Client Secret 재발급
- CI + Supabase Auth config → Kakao provider → secret 갱신
- .env.local 갱신

## 재발 방지 조치

1. 운영 토큰/비밀번호를 CLI 인자로 전달하지 말 것. 대신:
   - 환경변수 파일(`.env.local`)에만 저장, CLI에서 `env $(cat .env.local | xargs)` 패턴 사용
   - 또는 direnv로 쉘 진입 시 자동 로드
2. `cat .env.local` / `grep` 명령 금지. 필요 시 특정 키만 `grep "^KEY_NAME=" .env.local`로 제한 출력.
3. MCP execute_sql은 DB 직접 접속보다 우선 — 자격증명 전달 불필요.
4. Supabase pooler 경유 psql이 필요하면 PGPASSWORD 대신 `.pgpass` 파일(600) 사용.
5. CI secret 등록 시 masked 모드 확인. 로그 출력 금지.

## 운영 통제 위반 기록

동일 세션에서 아래 통제 위반 발생:

1. **production 메타데이터 직접 조작**: `supabase_migrations.schema_migrations` 에서 row delete + insert를 branch workaround 목적으로 수행. 정식 migration 경로 아님.
2. **운영 DB 대상 integration test 실행**: `tests/rate-limit-live.integration.test.ts`, `tests/create-case-atomic-rollback.integration.test.ts`가 prod DB를 대상으로 실행됨. rollback test는 트랜잭션 경계로 복구되나, 운영 DB를 테스트 베드로 쓰는 것은 비권장.

향후 원칙:
- staging 프로젝트 구축 전까지는 integration test를 dev/staging branch로 제한
- schema_migrations 수정은 CI pipeline을 통해서만 (수동 SQL 금지)

## 체크리스트

### 자동 완료 (2026-04-15 Claude)
- [x] **SUPABASE_SERVICE_ROLE_KEY 대체 발급** — 신규 secret key(`sb_secret_ivQ...`)를 Management API로 생성하여 .env.local 반영. 구 legacy JWT(`sJoRe...`)는 Supabase API로는 비활성화 불가. JWT secret rotation 전까지 유효하므로 ⚠️ dashboard에서 JWT secret 회전 필요
- [x] **SUPPORT_IMPERSONATION_COOKIE_SECRET 회전** — `openssl rand -hex 32`로 신규 값 생성 + .env.local 반영 (Claude 컨텍스트에 전체 값 미노출)

### 사용자 dashboard 작업 필수 (API 미공개)
- [x] SUPABASE_ACCESS_TOKEN rotation — 신규 `sbp_5e9529...` 발급, 구 `sbp_489aa6...` / `sbp_1747d4...` 전부 폐기
- [x] SUPABASE_DB_PASSWORD rotation — 신규 password 적용 (.env.local + Vercel 3환경)
- [x] Supabase JWT Secret: legacy JWT key(`anon`, `service_role`) dashboard에서 disabled 상태. 신규 API key 시스템으로 전환됨
- [x] NEXT_PUBLIC_SUPABASE_ANON_KEY → `sb_publishable_S5N27...`로 교체 (새 API key 시스템)
- [x] SUPABASE_SERVICE_ROLE_KEY → `sb_secret_QjUmT...`로 교체 (새 API key 시스템)
- [ ] PII_ENCRYPTION_KEY_BASE64 dual-key 마이그레이션 — **별도 프로젝트로 분리**. 재암호화 비용 크고 service_role 회전으로 즉각적 위협은 차단됨
- [x] GEMINI_API_KEY 재발급 — `AIzaSyAVgs8H...`. 구 `AIzaSyBLI...` http=400 확인
- [x] KAKAO_CLIENT_SECRET 재발급 — `QKkoUIS...`. Supabase Auth `external_kakao_secret` PATCH 반영 (http=200)
- [x] Vercel OIDC 자동 갱신 — `auto_refresh_via_vercel_cli` 플래그 유지
- [x] CI secrets(GitHub Actions) 재등록 — PAT / anon / service_role + STAGING_* 세트
- [x] Vercel environment variables 재등록 — production / preview / development 3환경

## Closure

**상태**: CLOSED (2026-04-15)

**핵심 회전 종료**:
- P0/P1 대상 7종 전부 회전 완료 (PAT, DB PW, service_role, anon, Gemini, Kakao, impersonation cookie)
- 로그 노출이 있었던 구 값 전부 폐기 확인 (Supabase API 조회 + Gemini http=400)

**미종결 항목**:
- ~~`PII_ENCRYPTION_KEY_BASE64`~~ — 2026-04-16 재암호화 완료. 커밋 `ad240d9` (Phase 1 dual-key) → prod 1 row 재암호화 실행 → `c2493ff` (Phase 3 v1 경로 제거). 구 키(`eB5dq2HS...`)는 코드·환경변수에서 완전 폐기. 신규 32-byte 키로 대체.

**후속 재발 방지**:
- 회전 프로세스를 `/tmp/rotate-secrets-v2.sh` + `/tmp/sync-from-envlocal.sh` 패턴으로 원샷화 (대화 로그에 평문 미노출, 터미널 `read -s` 기반)
- 회전 스크립트는 사용 후 즉시 삭제 (`rm /tmp/rotate-*`, `rm /tmp/env.local.backup.*`)
- 회전된 비밀값은 절대 `.env.local` 에디터로 직접 붙여넣지 않음 (에디터 "newer content" 경고 회피)
- Staging 프로젝트 분리로 production DB를 테스트 베드로 쓰지 않음 (2026-04-15 커밋 `a56733e`)
