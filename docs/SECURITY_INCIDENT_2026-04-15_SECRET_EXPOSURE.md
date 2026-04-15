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

- [ ] SUPABASE_ACCESS_TOKEN rotation 완료 + .env.local 갱신
- [ ] SUPABASE_DB_PASSWORD rotation 완료 + .env.local 갱신
- [ ] Supabase JWT Secret regenerate + anon/service_role 갱신 (CI + Vercel + .env.local)
- [ ] PII_ENCRYPTION_KEY dual-key 마이그레이션 계획 수립
- [ ] SUPPORT_IMPERSONATION_COOKIE_SECRET 갱신
- [ ] GEMINI_API_KEY 재발급
- [ ] KAKAO_CLIENT_SECRET 재발급
- [ ] Vercel OIDC는 자동 갱신 — 현재 만료일 확인
- [ ] 본 인시던트 보고를 내부 보안 채널에 공유
