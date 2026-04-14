-- =============================================================================
-- Forward-only hotfix (2026-04-14)
--   rehabilitation_prohibition_orders 원격 드리프트 복구.
--
--   migration 20260410000008_rehabilitation.sql:442 에 정의돼 있으나 원격 DB에는
--   존재하지 않음. 관련 액션 upsertProhibitionOrder가 production에서 실행 시
--   relation-not-found로 실패하는 원인이었다.
--
--   모든 DDL은 멱등 — 이미 테이블/정책/인덱스가 있는 환경에서 재실행해도 안전.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. 테이블 복구 (008 정의와 동일 스키마)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rehabilitation_prohibition_orders (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id               uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  organization_id       uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  court_name            text,
  applicant_name        text,
  resident_number_front text,
  registered_address    text,
  current_address       text,

  has_agent             boolean NOT NULL DEFAULT false,
  agent_type            text CHECK (agent_type IN ('법무사','변호사','기타')),
  agent_name            text,
  agent_phone           text,
  agent_fax             text,
  agent_address         text,
  agent_law_firm        text,

  total_debt_amount     bigint NOT NULL DEFAULT 0,
  creditor_count        int NOT NULL DEFAULT 0,
  reason_detail         text,

  attachments           text[] NOT NULL DEFAULT '{}',

  application_date      date,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_rehab_prohibition_order UNIQUE (case_id)
);

COMMENT ON TABLE public.rehabilitation_prohibition_orders IS
  '개인회생 금지명령 신청(법 제593조①). 20260414000003 hotfix로 원격 드리프트 복구.';

-- -----------------------------------------------------------------------------
-- 2. 인덱스 — case_id 조회 + (org, case) 복합
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_rehab_prohibition_case
  ON public.rehabilitation_prohibition_orders USING btree (case_id);

-- -----------------------------------------------------------------------------
-- 3. RLS — 다른 rehab 테이블과 동일하게 app.can_access_case 기준
-- -----------------------------------------------------------------------------

ALTER TABLE public.rehabilitation_prohibition_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rehab_prohibition_org_member ON public.rehabilitation_prohibition_orders;
DROP POLICY IF EXISTS rehab_prohibition_case_access ON public.rehabilitation_prohibition_orders;

CREATE POLICY rehab_prohibition_case_access ON public.rehabilitation_prohibition_orders
  AS PERMISSIVE FOR ALL TO authenticated
  USING (app.can_access_case(case_id))
  WITH CHECK (app.can_access_case(case_id));

-- -----------------------------------------------------------------------------
-- 4. updated_at 트리거 — 다른 rehab 테이블과 동일한 패턴
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_rehab_prohibition_updated_at ON public.rehabilitation_prohibition_orders;
CREATE TRIGGER trg_rehab_prohibition_updated_at
  BEFORE UPDATE ON public.rehabilitation_prohibition_orders
  FOR EACH ROW EXECUTE PROCEDURE app.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. 조직-사건 복합 FK (앞선 20260414000002의 표준과 정렬)
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.rehabilitation_prohibition_orders'::regclass
      AND conname = 'rehab_prohibition_case_org_fk'
  ) THEN
    ALTER TABLE public.rehabilitation_prohibition_orders
      ADD CONSTRAINT rehab_prohibition_case_org_fk
      FOREIGN KEY (case_id, organization_id)
      REFERENCES public.cases (id, organization_id)
      ON DELETE CASCADE;
  END IF;
END $$;
