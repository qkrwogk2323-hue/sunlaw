-- =============================================================================
-- Forward-only hotfix (2026-04-14)
--   Context: 20260410000001~20260410000012 squash가 이미 적용된 환경에서
--   rate_limit_buckets(인증 진입 경로 복구)와 create_case_atomic(사건 생성
--   원자화)을 추가해야 한다. squash 파일 편집은 fresh DB에만 반영되고
--   기존에 squash만 적용된 환경에는 반영되지 않으므로, 전진형 migration으로
--   분리한다. 모든 DDL은 멱등(idempotent)하게 작성한다.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. rate_limit_buckets
--    src/lib/rate-limit.ts의 checkDbRateLimit 분산 카운터 저장소.
--    service_role 전용. RLS 정책은 의도적으로 비워둠 → authenticated는 전면 거부.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  id text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 1 CHECK (attempts >= 0),
  window_start timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.rate_limit_buckets IS
  'Service-role-only distributed rate limit counters keyed by sha256 prefix of (endpoint:identifier). Accessed from src/lib/rate-limit.ts.';

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_expires_at
  ON public.rate_limit_buckets USING btree (expires_at);

-- -----------------------------------------------------------------------------
-- 2. create_case_atomic — 18 파라미터 버전
--    기존 15 파라미터 시그니처를 제거하고 insolvency_subtype / client_name /
--    client_role을 추가해 사건 생성을 단일 트랜잭션으로 묶는다.
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.create_case_atomic(uuid, text, text, text, text, text, jsonb, numeric, date, text, text, text, uuid, text, boolean);

CREATE OR REPLACE FUNCTION public.create_case_atomic(
  p_organization_id uuid,
  p_reference_no text,
  p_title text,
  p_case_type text,
  p_stage_template_key text,
  p_stage_key text,
  p_module_flags jsonb,
  p_principal_amount numeric,
  p_opened_on date,
  p_court_name text,
  p_case_number text,
  p_summary text,
  p_actor_id uuid,
  p_actor_name text,
  p_can_manage_collection boolean,
  p_insolvency_subtype text DEFAULT NULL,
  p_client_name text DEFAULT NULL,
  p_client_role text DEFAULT NULL
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_case_id uuid;
begin
  insert into public.cases (
    organization_id, reference_no, title, case_type, case_status,
    stage_template_key, stage_key, module_flags, principal_amount,
    opened_on, court_name, case_number, summary,
    insolvency_subtype,
    created_by, updated_by
  ) values (
    p_organization_id, p_reference_no, p_title, p_case_type::public.case_type, 'intake',
    p_stage_template_key, p_stage_key, p_module_flags, p_principal_amount,
    p_opened_on, p_court_name, p_case_number, p_summary,
    nullif(p_insolvency_subtype, '')::public.insolvency_subtype,
    p_actor_id, p_actor_id
  )
  returning id into v_case_id;

  insert into public.case_handlers (
    organization_id, case_id, profile_id, handler_name, role,
    created_by, updated_by
  ) values (
    p_organization_id, v_case_id, p_actor_id, coalesce(p_actor_name, '담당자'), 'case_manager',
    p_actor_id, p_actor_id
  );

  insert into public.case_organizations (
    organization_id, case_id, role, status, access_scope, billing_scope,
    communication_scope, is_lead, can_submit_legal_requests,
    can_receive_legal_requests, can_manage_collection, can_view_client_messages,
    created_by, updated_by
  ) values (
    p_organization_id, v_case_id, 'managing_org', 'active', 'full',
    'direct_client_billing', 'client_visible', true, true, true,
    p_can_manage_collection, true, p_actor_id, p_actor_id
  );

  if p_client_name is not null and length(btrim(p_client_name)) > 0 then
    insert into public.case_clients (
      organization_id, case_id, client_name, relation_label,
      is_portal_enabled, link_status,
      created_by, updated_by
    ) values (
      p_organization_id, v_case_id, btrim(p_client_name),
      coalesce(nullif(btrim(p_client_role), ''), '의뢰인'),
      false, 'linked',
      p_actor_id, p_actor_id
    );
  end if;

  return v_case_id;
end;
$function$;
