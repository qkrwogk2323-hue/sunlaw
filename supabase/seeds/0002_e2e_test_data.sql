-- =============================================================================
-- E2E 보안 경계 테스트 시드 (지시서 4.5)
--
-- 적용 대상: dev / staging only. production에 적용 금지.
-- 적용 방법: pnpm seed:e2e (별도 추가 필요) 또는 staging Supabase SQL editor에서
--           수동 실행. CI에서는 e2e-security-boundary job이 실행 직전에 수행.
--
-- production guard:
--   psql connection의 application_name이 'veinspiral-prod'면 abort
--   (운영자가 환경별로 application_name 지정할 책임)
--
-- 이 seed는 organizations + organization_memberships만 만든다.
-- auth.users + profiles + client_private_profiles는 scripts/seed-e2e-users.mjs
-- 로 admin client 통해 생성. 그 후 이 SQL을 실행해 멤버십 연결.
-- =============================================================================

DO $$
BEGIN
  IF current_setting('application_name', true) = 'veinspiral-prod' THEN
    RAISE EXCEPTION 'E2E seed cannot run in production (application_name=veinspiral-prod)';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1. organizations — A, B
-- -----------------------------------------------------------------------------

INSERT INTO public.organizations (
  id, slug, name, kind, lifecycle_status, created_at, updated_at
) VALUES
  (
    '11111111-1111-4111-8111-aaaaaaaaaaa1',
    'e2e-test-firm-a',
    'E2E 테스트 법무법인 A',
    'law_firm',
    'active',
    now(), now()
  ),
  (
    '11111111-1111-4111-8111-bbbbbbbbbbb1',
    'e2e-test-firm-b',
    'E2E 테스트 법무법인 B',
    'law_firm',
    'active',
    now(), now()
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. organization_memberships
--   profile UUID는 scripts/seed-e2e-users.mjs 출력에서 가져와 환경변수로 주입.
--   여기서는 envvar 기반 INSERT를 .mjs 스크립트가 처리. 본 SQL은 시드된
--   사용자가 이미 profiles에 있을 때 멤버십만 연결.
--
--   ※ 운영자는 다음 환경변수를 반드시 .env.local 또는 CI secrets에 등록:
--     E2E_SEED_USER_MANAGER_PROFILE_ID
--     E2E_SEED_USER_ASSIGNED_PROFILE_ID
--     E2E_SEED_USER_UNASSIGNED_PROFILE_ID
--     E2E_SEED_USER_OTHERORG_PROFILE_ID
--     E2E_SEED_USER_CLIENT_PROFILE_ID
--   .mjs 스크립트가 생성 후 출력 → secret으로 등록 → CI에서 SQL 변수로 치환.
--
-- DO $$ DECLARE manager_id uuid := :'manager_id'; ... 형태로 동적 INSERT 가능
-- 하지만 Supabase SQL editor는 :변수 미지원 → .mjs 스크립트가 직접 INSERT
-- 수행하는 것이 더 안정적. 본 SQL은 organizations 시드까지만 담당.
