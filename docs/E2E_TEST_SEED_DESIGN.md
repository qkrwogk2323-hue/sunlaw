# E2E 보안 테스트 시드 설계

> 지시서 DIRECTIVE_RESOLVE_CHAOS.md 4.5 — 비배정/타조직 사용자 차단 검증을 위한
> 테스트 시드 데이터 설계.

## 요구

비배정·타조직 사용자가 다음 경로로 차단되는지 검증해야 한다:
- `cover` URL 직접 진입
- `rehabilitation` URL 직접 진입
- `bankruptcy` URL 직접 진입
- 위 모듈의 서버 액션 POST 직접 호출
- wrong subtype (회생 사건에 파산 액션, 그 반대) 호출

따라서 단일 조직 + 3 유형 사용자로는 부족하다. **조직 A · 조직 B + 4유형
사용자 + 사건 3종**을 시드해야 한다.

## 시드 구성

### 조직 (2개)

| ID 변수 | slug | name | 비고 |
|---|---|---|---|
| `e2e-org-a` | `e2e-test-firm-a` | E2E 테스트 법무법인 A | 메인 조직 |
| `e2e-org-b` | `e2e-test-firm-b` | E2E 테스트 법무법인 B | 타조직 차단 검증용 |

### 사용자 (5명, 모두 조직 A 컨텍스트 기준)

| 변수 | 이메일 | profiles 역할 | 멤버십 (org_a) | 멤버십 (org_b) | case_scope_policy | 용도 |
|---|---|---|---|---|---|---|
| `u_org_a_manager` | `e2e+a-manager@veinspiral.test` | standard | `org_manager` | — | `all_org_cases` | 모든 사건 접근 가능, 컨트롤 케이스 |
| `u_org_a_assigned` | `e2e+a-assigned@veinspiral.test` | standard | `staff` | — | `assigned_cases_only` | 특정 사건에 case_handlers 등록 |
| `u_org_a_unassigned` | `e2e+a-unassigned@veinspiral.test` | standard | `staff` | — | `assigned_cases_only` | case_handlers 등록 X — 비배정 차단 검증의 주체 |
| `u_org_b_member` | `e2e+b-member@veinspiral.test` | standard | — | `org_manager` | `all_org_cases` | 타조직 차단 검증의 주체 |
| `u_client` | `e2e+client@veinspiral.test` | standard, `is_client_account=true` | — | — | — | 의뢰인 포털 접근 검증 |

### 사건 (3개, 전부 조직 A 소속)

| 변수 | 제목 | case_type | insolvency_subtype | case_handlers 등록 | case_clients 등록 |
|---|---|---|---|---|---|
| `case_general` | E2E 일반사건 | `general` | NULL | `u_org_a_assigned` | `u_client` |
| `case_rehab` | E2E 회생사건 | `insolvency` | `individual_rehabilitation` | `u_org_a_assigned` | `u_client` |
| `case_bankruptcy` | E2E 파산사건 | `insolvency` | `individual_bankruptcy` | `u_org_a_assigned` | `u_client` |

## 검증 매트릭스 (E2E 시나리오)

| # | 시나리오 | 사용자 | 대상 사건 | URL | 기대 응답 |
|---|---|---|---|---|---|
| 1 | 비배정 차단 (cover URL) | `u_org_a_unassigned` | `case_general` | `/cases/{id}/cover` | 404 |
| 2 | 비배정 차단 (rehab URL) | `u_org_a_unassigned` | `case_rehab` | `/cases/{id}/rehabilitation` | 404 |
| 3 | 비배정 차단 (bankruptcy URL) | `u_org_a_unassigned` | `case_bankruptcy` | `/cases/{id}/bankruptcy` | 404 |
| 4 | 비배정 차단 (rehab POST) | `u_org_a_unassigned` | `case_rehab` | `upsertRehabCreditor` | `{ ok: false, code: 'NO_ACCESS' }` |
| 5 | 비배정 차단 (bankruptcy POST) | `u_org_a_unassigned` | `case_bankruptcy` | `upsertBankruptcyApplication` | `{ ok: false, code: 'NO_ACCESS' }` |
| 6 | 타조직 차단 (cover URL) | `u_org_b_member` | `case_general` | `/cases/{id}/cover` | 404 |
| 7 | 타조직 차단 (rehab URL) | `u_org_b_member` | `case_rehab` | `/cases/{id}/rehabilitation` | 404 |
| 8 | wrong subtype (회생 → 파산) | `u_org_a_assigned` | `case_rehab` | `/cases/{id}/bankruptcy` | 404 |
| 9 | wrong subtype (파산 → 회생) | `u_org_a_assigned` | `case_bankruptcy` | `/cases/{id}/rehabilitation` | 404 |
| 10 | wrong subtype POST (rehab action on bankruptcy case) | `u_org_a_assigned` | `case_bankruptcy` | `upsertRehabCreditor` | `{ ok: false, code: 'WRONG_TYPE' }` |
| 11 | 컨트롤 (배정 사용자 정상 진입) | `u_org_a_assigned` | `case_rehab` | `/cases/{id}/rehabilitation` | 200 + 내용 표시 |
| 12 | 컨트롤 (org_manager 정상 진입) | `u_org_a_manager` | `case_bankruptcy` | `/cases/{id}/bankruptcy` | 200 + 내용 표시 |

## 시드 적용 방식

**원칙**: production 데이터에 영향을 주면 안 됨. 따라서 시드는 두 가지 후보:

### 후보 A — 별도 schema (`e2e_test`) 도입
- 새 schema에 대응 테이블 view 작성 후 RLS 우회 path
- **단점**: 기존 RLS 정책이 `public` 스키마 전제라 적용 불가 → 검증 자체가 의미 없어짐

### 후보 B — `public` 스키마에 시드 + soft 식별자 (권장)
- 모든 시드 row의 `created_by_name`이나 `summary`에 `[E2E_SEED]` 접두어
- 시드 SQL은 `supabase/seed/e2e-test-data.sql` (migration 아님 — `supabase db seed` 또는 수동 SQL 적용)
- production에는 **절대 적용 금지** — 스크립트 첫 줄에서 `SELECT current_database()` 확인 후 prod면 abort
- 별도 `pnpm seed:e2e` 명령으로 staging/dev에서만 적용

### 후보 C — Playwright global setup (런타임 시드)
- Playwright 시작 시 admin client로 시드 INSERT, 종료 시 DELETE
- E2E 격리성 최고
- 단점: 매 실행마다 Supabase 호출 다수 → 느림 + 비용

**권장**: 후보 B + C 하이브리드. 정적 조직/사용자는 후보 B로 1회 시드, 사건 3종은
후보 C로 매 실행마다 setup/teardown.

## 시드 SQL 스켈레톤 (`supabase/seed/e2e-test-data.sql`)

```sql
-- E2E 테스트 시드. production에 적용 금지.
DO $$
BEGIN
  IF current_setting('app.environment', true) = 'production' THEN
    RAISE EXCEPTION 'E2E seed cannot run in production';
  END IF;
END $$;

-- 1. organizations
INSERT INTO public.organizations (id, slug, name, kind, ...) VALUES
  ('11111111-1111-4111-8111-aaaaaaaaaaa1', 'e2e-test-firm-a', 'E2E 테스트 법무법인 A', 'law_firm', ...),
  ('11111111-1111-4111-8111-bbbbbbbbbbb1', 'e2e-test-firm-b', 'E2E 테스트 법무법인 B', 'law_firm', ...)
ON CONFLICT (id) DO NOTHING;

-- 2. auth.users + profiles (admin client로 별도 처리 권장 — auth.users는 SQL 직접 INSERT 위험)
-- → seeds/e2e-create-users.mjs 스크립트로 supabase.auth.admin.createUser 호출

-- 3. memberships
INSERT INTO public.organization_memberships (...) VALUES
  -- u_org_a_manager → org_a, role=org_manager, scope=all_org_cases
  -- u_org_a_assigned → org_a, role=staff, scope=assigned_cases_only
  -- u_org_a_unassigned → org_a, role=staff, scope=assigned_cases_only
  -- u_org_b_member → org_b, role=org_manager, scope=all_org_cases
ON CONFLICT (organization_id, profile_id) DO NOTHING;
```

## Playwright 측 fixture (`tests/e2e/fixtures/seed.ts`)

```ts
import { test as base } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

type Seed = {
  caseGeneralId: string;
  caseRehabId: string;
  caseBankruptcyId: string;
};

export const test = base.extend<{ seed: Seed }>({
  seed: async ({}, use) => {
    const admin = createClient(...);
    // 사건 3종 INSERT, case_handlers/case_clients 연결
    const seed = await createCases(admin);
    await use(seed);
    // teardown: cases CASCADE로 정리
    await admin.from('cases').delete().in('id', [seed.caseGeneralId, seed.caseRehabId, seed.caseBankruptcyId]);
  },
});
```

## 구현 상태 (2026-04-14 최종)

12 시나리오를 다음 두 레이어로 분할 구현:

### Playwright E2E — `tests/e2e/security-boundary.spec.ts` (9 시나리오)
- URL 진입 차단 + 컨트롤 케이스만 E2E가 가장 적합
- #1, #2, #3 (비배정 URL 차단 3건)
- #6, #7 (타조직 URL 차단 2건)
- #8, #9 (wrong subtype URL 차단 2건)
- #11, #12 (컨트롤 — 정상 진입 2건)
- **주의**: #6에서 general 사건만 커버. 별도 rehab/bankruptcy 타조직 차단은 #1,2,3으로 URL 차단 자체가 검증되므로 중복 회피

### Vitest 단위 — `tests/security-boundary-post.test.ts` (3 시나리오 + 컨트롤 1)
서버 액션 POST를 E2E에서 raw HTTP로 때리기 복잡 → `checkCaseActionAccess`
가드 자체를 단위 테스트로 커버:
- #4 (비배정 + rehab action → NO_ACCESS)
- #5 (비배정 + bankruptcy action → NO_ACCESS)
- #10 (wrong subtype POST → WRONG_TYPE)
- 컨트롤 (배정 + 올바른 subtype → ok:true)

### 총 12 시나리오 완결
- E2E 9 + 단위 3 = 12 (설계와 일치)
- E2E는 env + seed 적용 후 가동
- 단위 테스트는 모킹 기반이라 env 없이도 즉시 가동 (4/4 passed 확인)

## 적용 체크리스트 (운영자)

1. ✅ `supabase/seeds/0002_e2e_test_data.sql` — staging/dev에 적용
2. ✅ `scripts/seed-e2e-users.mjs` — 실행, 출력 profile_id 기록
3. ✅ `tests/e2e/fixtures/seed.ts` — Playwright fixture 작성 완료
4. ✅ `tests/e2e/security-boundary.spec.ts` — 9 시나리오 spec 완료
5. ✅ `tests/security-boundary-post.test.ts` — 3 POST 시나리오 완료
6. ✅ CI workflow `e2e-security-boundary` job — secret-gated 추가 완료
7. ⬜ GitHub Secrets 등록 (`docs/CI_SECRETS.md` 참조)
8. ⬜ main 머지 또는 workflow_dispatch로 실제 가동 확인
