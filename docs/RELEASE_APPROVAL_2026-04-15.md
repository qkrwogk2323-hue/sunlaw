# 릴리즈 승인 보고서 — 2026-04-15

> 작성: 2026-04-15
> 판정: **승인 가능** (검증관 Step ① ~ ④ 종결)
> 이전 판정: `내부 테스트용 가능` (2026-04-15 검증관 1차·2차)

이 문서는 `docs/DEPLOYMENT_PROGRESS_2026-04-15.md`의 기술 진척 보고서와
`docs/SECURITY_INCIDENT_2026-04-15_SECRET_EXPOSURE.md`의 보안 incident
closure 기록을 하나의 결재 기준으로 통합한다.

---

## 1. 기술 상태 — ✅ 승인

| 종료기준 | 상태 | 근거 |
|---|---|---|
| fresh DB apply 통과 | ✅ | `supabase/migrations/_regenerated/001~008`을 로컬 PG17에 순차 apply → 91 tables / 46 functions / 150 triggers / 192 policies / 264 indexes / 184 seed rows. `DEPLOYMENT_PROGRESS_2026-04-15.md §1` |
| upgrade apply 통과 | ✅ | prod vs fresh schema diff = 0 (1342 컬럼 / 46 fn hash / 192 policy hash / 149 trigger hash 완전 일치). 재생성 squash를 prod에 재apply해도 no-op. `DEPLOYMENT_PROGRESS_2026-04-15.md §2` |
| branch/staging 생성 성공 | ✅ | **staging 프로젝트 신설로 대체**. `veinspiral-staging` (ref `siljimybhmmtbligzbms`, ap-northeast-2, PG17) 생성. migration 20개 적용 + schema parity 확인 (tables 90, functions 46, triggers 149, policies public 187 / storage 4). 과거 branch workaround는 폐기. |
| live auth · 보안 E2E · UI 구조개선 | ✅ | Live integration 3건 (rate-limit), atomic rollback 2건 staging green. 보안 경계 9 시나리오 + POST 3건 CI green. notification interaction registry 3종 결함 해소. |

### CI 증적

| Run | Commit | Result | 비고 |
|---|---|---|---|
| [24440437758](https://github.com/qkrwogk2323-hue/sunlaw/actions/runs/24440437758) | `c678af0` | ✅ success | staging 전환 전 마지막 green (prod 대상 live-integration 3건 pass 포함) |
| [24463148263](https://github.com/qkrwogk2323-hue/sunlaw/actions/runs/24463148263) | `a56733e` | ❌ failure | staging 전환 후 첫 실전 — test fixture 2 / CI CLI 설치 누락 1건 발견 |
| [24464310120](https://github.com/qkrwogk2323-hue/sunlaw/actions/runs/24464310120) | `01aa39e` | ✅ **success** | **Staging 기준 첫 ALL GREEN** |

Run `24464310120` 5 job 결과:
- `validate` ✅
- `e2e-smoke` ✅
- `e2e-production-smoke` ✅
- `live-integration` ✅ (staging 대상)
- `e2e-security-boundary` ✅ (staging 대상)
- `e2e-authenticated-production-smoke` ⏭ (workflow_dispatch only, 의도)

---

## 2. 운영 상태 — ✅ 승인

### 2.1 Production 비검증 원칙 수립
- 과거: prod DB 대상으로 `rate-limit-live.integration.test.ts`, `create-case-atomic-rollback.integration.test.ts` 실행됨 + prod `schema_migrations` 수동 편집 이력 있음.
- 현재: CI job `live-integration`, `e2e-security-boundary`의 env를 `STAGING_*` secret 참조로 전환 (커밋 `a56733e`). prod DB는 운영만 담당.

### 2.2 Staging 프로젝트 — 표준 경로
- Ref: `siljimybhmmtbligzbms`
- Region: `ap-northeast-2` (prod 동일)
- Migration 20개 적용 방식: Supabase Management API `/v1/projects/:ref/database/query` + 자체 preprocessor 2종
  - `AS $tag$` closing 뒤 누락 세미콜론 보완
  - `CREATE TRIGGER` 앞 `DROP TRIGGER IF EXISTS` 삽입 (멱등)
  - 특수: seed_data의 nested `$$` → `$cron_body$` 태그로 치환, hotfix_008의 `COMMENT ON TABLE storage.buckets` 권한 없음 → 스킵
- 과거 branch workaround(`fresh-squash-*` 12개 branch + prod `schema_migrations` 삭제·재삽입)는 폐기. 향후 schema 변경은 staging → production 단방향.

### 2.3 Seed 데이터 (staging 한정)
- SQL: `supabase/seeds/0002_e2e_test_data.sql` → 조직 A, B (`11111111-...-aaaaaaaaaaa1/bbbbbbbbbbb1`)
- Node: `scripts/seed-e2e-users.mjs` → 5 테스트 유저 (manager/assigned/unassigned/otherorg/client) + 멤버십
  - 버그 수정: `role: 'staff'` → `'org_staff'` (enum 정합)

### 2.4 Secrets 레이아웃
- Prod 전용: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID` (types:check용)
- Staging 전용: `STAGING_SUPABASE_URL/NEXT_PUBLIC_*/SERVICE_ROLE_KEY/PROJECT_ID/TEST_ORG_ID/TEST_ACTOR_ID`
- E2E seed: `E2E_SEED_USER_*_EMAIL/PROFILE_ID` (11종) + `E2E_SEED_USER_PASSWORD`
- 모든 staging 작업에서 prod DB write 0건 확인

### 2.5 수동 확인 (결재 전 1건)
- [ ] **카카오 로그인 수동 smoke** — `external_kakao_secret` rotation 반영 후 첫 실전 로그인 시도. 성공하면 이 박스를 `[x]`로 체크 후 승인 효력 발생.
  - 테스트 계정: 네가 쓰는 카카오 계정 1개로 `https://www.veinspiral.com/login` → 카카오로 시작하기 → 조직 또는 의뢰인 경로 진입 확인.
  - 실패 시: Supabase Dashboard → Auth → Providers → Kakao의 secret이 최신(`QKkoUIS...`)인지 재확인, 필요시 PATCH 재실행.

---

## 3. 보안 상태 — ✅ 승인 (1건 유예)

상세: `docs/SECURITY_INCIDENT_2026-04-15_SECRET_EXPOSURE.md` Closure 섹션.

### 회전 완료 (7종)
| 항목 | 구 prefix | 신규 prefix | live 검증 |
|---|---|---|---|
| Supabase PAT | `sbp_489aa6...` → 폐기 | `sbp_5e9529...` | API 조회 로그 |
| DB Password | 공개 폐기 | 로컬·GitHub·Vercel 반영 | (로컬 검증용 MCP) |
| Service Role | `sb_secret_LUz7J...` → 폐기 | `sb_secret_QjUmT...` | staging admin API http=200 |
| Anon/Publishable | `sb_publishable_cliBj...` → 폐기 | `sb_publishable_S5N27...` | auth/v1/health http=200 |
| Gemini API Key | `AIzaSyBLI...` → 삭제 | `AIzaSyAVgs8H...` | 구키 http=400 확인 |
| Kakao Client Secret | 공개 폐기 | `QKkoUIS7VN...` | Supabase Auth PATCH http=200 |
| Impersonation Cookie | 공개 폐기 | `openssl rand -hex 32` | — |

### Legacy JWT
- `anon` / `service_role` legacy JWT: Supabase dashboard에서 disabled 상태. 공개적으로 유출된 값이 있어도 인증 거부됨.

### 유예 (1건)
- `PII_ENCRYPTION_KEY_BASE64` — 기암호화 데이터 재마이그레이션이 필요하므로 회전 보류. 별도 프로젝트로 분리.
  - 현재 값은 service_role과 결합하지 않으면 DB 접근 불가. service_role이 회전됐으므로 **즉시 위협은 차단**.
  - 다음 PII 재암호화 배포에서 신규 키로 교체 예정.

### 임시 파일 정리
```
/tmp/env.local.backup.* — 삭제 확인 (2026-04-15)
/tmp/rotate-secrets-v2.sh — 삭제 확인
/tmp/sync-from-envlocal.sh — 삭제 확인
/tmp/mig009_fixed.sql, /tmp/seed_fixed.sql, /tmp/reconcile.sql — 삭제 확인
```

---

## 4. 승인 체크리스트

### 기술
- [x] fresh DB apply 성공
- [x] upgrade apply 성공 (schema diff = 0)
- [x] Staging 프로젝트 생성 + migration 20개 적용 + schema parity
- [x] CI 전 job green — run `24464310120` 기준
- [x] typecheck·lint·test·build·check:migrations 통과 (validate job)
- [x] 보안 경계 9 시나리오 + POST 3건 green (staging)

### 운영
- [x] Live integration이 staging 대상으로만 실행
- [x] Prod `schema_migrations` 수동 편집 금지 원칙 수립
- [x] STAGING_* secrets 등록
- [x] Seed 데이터 재현 가능 (SQL + node 스크립트 멱등)
- [ ] 카카오 로그인 수동 smoke 1회 성공

### 보안
- [x] P0/P1 secret 7종 회전 완료
- [x] 구 키 폐기 확인 (Supabase API + Gemini http=400)
- [x] Legacy JWT disabled
- [x] 회전 과정 임시 파일 삭제
- [x] `.env.local` / `.env.staging` 모두 `.gitignore` 보호
- [ ] (유예) PII 재암호화 마이그레이션 → 별도 프로젝트

---

## 5. 결재선

1. 개발팀 — 위 체크리스트 전부 ✅ 확인
2. 검증관 — 본 문서와 `DEPLOYMENT_PROGRESS`, `SECURITY_INCIDENT` 3건 비교 후 판정
3. 운영자 — 카카오 로그인 수동 smoke 수행 후 최종 체크 → 승인 효력 발생

---

## 6. 판정

**상태**: 카카오 로그인 수동 smoke 1건만 남음. 성공 확인 시 공식 판정을
`내부 테스트용 가능` → **`실서비스 투입 가능`**으로 전환.

그 전까지의 공식 상태는 여전히 `내부 테스트용 가능`이며, 이 문서는 승인 선언
직전 상태를 고정한 결재 기준이다.

---

## 참조 문서

- `docs/DEPLOYMENT_PROGRESS_2026-04-15.md` — 기술 진척
- `docs/SECURITY_INCIDENT_2026-04-15_SECRET_EXPOSURE.md` — 보안 incident closure
- `docs/DEPLOYMENT_BLOCKER_FRESH_DB_REPLAY.md` — 이전 차단 보고서 (종결)
- `docs/CI_SECRETS.md` — CI secret 명세
- `docs/E2E_TEST_SEED_DESIGN.md` — E2E seed 설계
- `docs/DIRECTIVE_RESOLVE_CHAOS.md` — 지시서 원본

## 참조 commit

- `c678af0` — staging 전환 직전 마지막 prod 대상 green
- `a56733e` — staging 분리 (live-integration + security-boundary → STAGING_*)
- `01aa39e` — staging 전환 후 잔여 CI 이슈 수정 (fixture `'general'` → `'civil'`, Supabase CLI setup-cli 추가)
