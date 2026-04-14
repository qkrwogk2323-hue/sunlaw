-- =============================================================================
-- Forward-only hotfix (2026-04-14)
--   지시서 DIRECTIVE_RESOLVE_CHAOS.md 4.3, 6.3:
--   (case_id, organization_id) -> cases(id, organization_id) 복합 FK를
--   rehabilitation_* / insolvency_* 전 테이블로 확장.
--
-- 현황 (migration 작성 시점):
--   - rehabilitation_applications, rehabilitation_creditors,
--     rehabilitation_prohibition_orders: 이미 복합 FK 존재 (20260414000002/003)
--   - insolvency_* 7개 테이블: organization_id 컬럼 존재, FK만 추가하면 됨
--   - rehabilitation_* 8개 테이블: organization_id 컬럼 없음
--     → ADD COLUMN + 기존 데이터 백필 + BEFORE INSERT 트리거 + 복합 FK
--
-- 설계 — rehabilitation 8개 테이블:
--   1) ADD COLUMN organization_id uuid (NULL 허용 상태로 시작)
--   2) UPDATE ... SET organization_id = cases.organization_id (백필)
--   3) BEFORE INSERT 트리거: organization_id가 NULL이면 cases에서 복사
--      — 앱 코드가 아직 organization_id를 insert에 포함하지 않아도 정상 동작
--      — 앱 코드가 organization_id를 포함하는 경우 트리거는 덮어쓰지 않음
--   4) SET NOT NULL (이제 트리거가 채워줌)
--   5) 복합 FK (case_id, organization_id) → cases(id, organization_id)
--      — 앱 코드가 잘못된 organization_id를 전달하면 FK가 거부
--
-- 멱등성:
--   ADD COLUMN IF NOT EXISTS / CREATE OR REPLACE TRIGGER / DO 블록으로 FK 재생성
--   체크. 이미 적용된 환경에서 재실행 안전.
--
-- 사전 확인(migration 작성 시 mcp 쿼리): 모든 대상 테이블의 case_id 참조에
-- orphan 0건, insolvency 테이블의 case_id↔organization_id 불일치 0건.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 공통 트리거 함수 — organization_id 백필
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION app.fill_organization_id_from_case()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.case_id IS NOT NULL THEN
    SELECT c.organization_id INTO NEW.organization_id
    FROM public.cases c
    WHERE c.id = NEW.case_id;
  END IF;
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION app.fill_organization_id_from_case() IS
  'BEFORE INSERT 트리거 — rehab 하위 테이블에서 organization_id가 누락된 경우 cases에서 자동 복사. 복합 FK가 최종 정합성 검증.';

-- -----------------------------------------------------------------------------
-- Phase A — rehabilitation 8개 테이블에 organization_id + 복합 FK 추가
-- -----------------------------------------------------------------------------

-- rehabilitation_affidavits
ALTER TABLE public.rehabilitation_affidavits ADD COLUMN IF NOT EXISTS organization_id uuid;
UPDATE public.rehabilitation_affidavits r
  SET organization_id = c.organization_id
  FROM public.cases c
  WHERE c.id = r.case_id AND r.organization_id IS NULL;
DROP TRIGGER IF EXISTS trg_rehab_affidavits_fill_org ON public.rehabilitation_affidavits;
CREATE TRIGGER trg_rehab_affidavits_fill_org
  BEFORE INSERT ON public.rehabilitation_affidavits
  FOR EACH ROW EXECUTE PROCEDURE app.fill_organization_id_from_case();
ALTER TABLE public.rehabilitation_affidavits ALTER COLUMN organization_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.rehabilitation_affidavits'::regclass AND conname='rehab_affidavits_case_org_fk') THEN
    ALTER TABLE public.rehabilitation_affidavits
      ADD CONSTRAINT rehab_affidavits_case_org_fk
      FOREIGN KEY (case_id, organization_id) REFERENCES public.cases(id, organization_id) ON DELETE CASCADE;
  END IF;
END $$;

-- rehabilitation_creditor_settings
ALTER TABLE public.rehabilitation_creditor_settings ADD COLUMN IF NOT EXISTS organization_id uuid;
UPDATE public.rehabilitation_creditor_settings r
  SET organization_id = c.organization_id
  FROM public.cases c
  WHERE c.id = r.case_id AND r.organization_id IS NULL;
DROP TRIGGER IF EXISTS trg_rehab_cred_settings_fill_org ON public.rehabilitation_creditor_settings;
CREATE TRIGGER trg_rehab_cred_settings_fill_org
  BEFORE INSERT ON public.rehabilitation_creditor_settings
  FOR EACH ROW EXECUTE PROCEDURE app.fill_organization_id_from_case();
ALTER TABLE public.rehabilitation_creditor_settings ALTER COLUMN organization_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.rehabilitation_creditor_settings'::regclass AND conname='rehab_cred_settings_case_org_fk') THEN
    ALTER TABLE public.rehabilitation_creditor_settings
      ADD CONSTRAINT rehab_cred_settings_case_org_fk
      FOREIGN KEY (case_id, organization_id) REFERENCES public.cases(id, organization_id) ON DELETE CASCADE;
  END IF;
END $$;

-- rehabilitation_family_members
ALTER TABLE public.rehabilitation_family_members ADD COLUMN IF NOT EXISTS organization_id uuid;
UPDATE public.rehabilitation_family_members r
  SET organization_id = c.organization_id
  FROM public.cases c
  WHERE c.id = r.case_id AND r.organization_id IS NULL;
DROP TRIGGER IF EXISTS trg_rehab_family_fill_org ON public.rehabilitation_family_members;
CREATE TRIGGER trg_rehab_family_fill_org
  BEFORE INSERT ON public.rehabilitation_family_members
  FOR EACH ROW EXECUTE PROCEDURE app.fill_organization_id_from_case();
ALTER TABLE public.rehabilitation_family_members ALTER COLUMN organization_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.rehabilitation_family_members'::regclass AND conname='rehab_family_case_org_fk') THEN
    ALTER TABLE public.rehabilitation_family_members
      ADD CONSTRAINT rehab_family_case_org_fk
      FOREIGN KEY (case_id, organization_id) REFERENCES public.cases(id, organization_id) ON DELETE CASCADE;
  END IF;
END $$;

-- rehabilitation_income_settings
ALTER TABLE public.rehabilitation_income_settings ADD COLUMN IF NOT EXISTS organization_id uuid;
UPDATE public.rehabilitation_income_settings r
  SET organization_id = c.organization_id
  FROM public.cases c
  WHERE c.id = r.case_id AND r.organization_id IS NULL;
DROP TRIGGER IF EXISTS trg_rehab_income_fill_org ON public.rehabilitation_income_settings;
CREATE TRIGGER trg_rehab_income_fill_org
  BEFORE INSERT ON public.rehabilitation_income_settings
  FOR EACH ROW EXECUTE PROCEDURE app.fill_organization_id_from_case();
ALTER TABLE public.rehabilitation_income_settings ALTER COLUMN organization_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.rehabilitation_income_settings'::regclass AND conname='rehab_income_case_org_fk') THEN
    ALTER TABLE public.rehabilitation_income_settings
      ADD CONSTRAINT rehab_income_case_org_fk
      FOREIGN KEY (case_id, organization_id) REFERENCES public.cases(id, organization_id) ON DELETE CASCADE;
  END IF;
END $$;

-- rehabilitation_plan_sections
ALTER TABLE public.rehabilitation_plan_sections ADD COLUMN IF NOT EXISTS organization_id uuid;
UPDATE public.rehabilitation_plan_sections r
  SET organization_id = c.organization_id
  FROM public.cases c
  WHERE c.id = r.case_id AND r.organization_id IS NULL;
DROP TRIGGER IF EXISTS trg_rehab_plan_fill_org ON public.rehabilitation_plan_sections;
CREATE TRIGGER trg_rehab_plan_fill_org
  BEFORE INSERT ON public.rehabilitation_plan_sections
  FOR EACH ROW EXECUTE PROCEDURE app.fill_organization_id_from_case();
ALTER TABLE public.rehabilitation_plan_sections ALTER COLUMN organization_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.rehabilitation_plan_sections'::regclass AND conname='rehab_plan_case_org_fk') THEN
    ALTER TABLE public.rehabilitation_plan_sections
      ADD CONSTRAINT rehab_plan_case_org_fk
      FOREIGN KEY (case_id, organization_id) REFERENCES public.cases(id, organization_id) ON DELETE CASCADE;
  END IF;
END $$;

-- rehabilitation_properties
ALTER TABLE public.rehabilitation_properties ADD COLUMN IF NOT EXISTS organization_id uuid;
UPDATE public.rehabilitation_properties r
  SET organization_id = c.organization_id
  FROM public.cases c
  WHERE c.id = r.case_id AND r.organization_id IS NULL;
DROP TRIGGER IF EXISTS trg_rehab_properties_fill_org ON public.rehabilitation_properties;
CREATE TRIGGER trg_rehab_properties_fill_org
  BEFORE INSERT ON public.rehabilitation_properties
  FOR EACH ROW EXECUTE PROCEDURE app.fill_organization_id_from_case();
ALTER TABLE public.rehabilitation_properties ALTER COLUMN organization_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.rehabilitation_properties'::regclass AND conname='rehab_properties_case_org_fk') THEN
    ALTER TABLE public.rehabilitation_properties
      ADD CONSTRAINT rehab_properties_case_org_fk
      FOREIGN KEY (case_id, organization_id) REFERENCES public.cases(id, organization_id) ON DELETE CASCADE;
  END IF;
END $$;

-- rehabilitation_property_deductions
ALTER TABLE public.rehabilitation_property_deductions ADD COLUMN IF NOT EXISTS organization_id uuid;
UPDATE public.rehabilitation_property_deductions r
  SET organization_id = c.organization_id
  FROM public.cases c
  WHERE c.id = r.case_id AND r.organization_id IS NULL;
DROP TRIGGER IF EXISTS trg_rehab_prop_deductions_fill_org ON public.rehabilitation_property_deductions;
CREATE TRIGGER trg_rehab_prop_deductions_fill_org
  BEFORE INSERT ON public.rehabilitation_property_deductions
  FOR EACH ROW EXECUTE PROCEDURE app.fill_organization_id_from_case();
ALTER TABLE public.rehabilitation_property_deductions ALTER COLUMN organization_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.rehabilitation_property_deductions'::regclass AND conname='rehab_prop_deductions_case_org_fk') THEN
    ALTER TABLE public.rehabilitation_property_deductions
      ADD CONSTRAINT rehab_prop_deductions_case_org_fk
      FOREIGN KEY (case_id, organization_id) REFERENCES public.cases(id, organization_id) ON DELETE CASCADE;
  END IF;
END $$;

-- rehabilitation_secured_properties
ALTER TABLE public.rehabilitation_secured_properties ADD COLUMN IF NOT EXISTS organization_id uuid;
UPDATE public.rehabilitation_secured_properties r
  SET organization_id = c.organization_id
  FROM public.cases c
  WHERE c.id = r.case_id AND r.organization_id IS NULL;
DROP TRIGGER IF EXISTS trg_rehab_secured_fill_org ON public.rehabilitation_secured_properties;
CREATE TRIGGER trg_rehab_secured_fill_org
  BEFORE INSERT ON public.rehabilitation_secured_properties
  FOR EACH ROW EXECUTE PROCEDURE app.fill_organization_id_from_case();
ALTER TABLE public.rehabilitation_secured_properties ALTER COLUMN organization_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.rehabilitation_secured_properties'::regclass AND conname='rehab_secured_case_org_fk') THEN
    ALTER TABLE public.rehabilitation_secured_properties
      ADD CONSTRAINT rehab_secured_case_org_fk
      FOREIGN KEY (case_id, organization_id) REFERENCES public.cases(id, organization_id) ON DELETE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Phase B — insolvency 7개 테이블에 복합 FK 추가 (컬럼 이미 존재)
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.insolvency_client_action_items'::regclass AND conname='insolvency_action_items_case_org_fk') THEN
    ALTER TABLE public.insolvency_client_action_items
      ADD CONSTRAINT insolvency_action_items_case_org_fk
      FOREIGN KEY (case_id, organization_id) REFERENCES public.cases(id, organization_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.insolvency_client_action_packets'::regclass AND conname='insolvency_action_packets_case_org_fk') THEN
    ALTER TABLE public.insolvency_client_action_packets
      ADD CONSTRAINT insolvency_action_packets_case_org_fk
      FOREIGN KEY (case_id, organization_id) REFERENCES public.cases(id, organization_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.insolvency_collaterals'::regclass AND conname='insolvency_collaterals_case_org_fk') THEN
    ALTER TABLE public.insolvency_collaterals
      ADD CONSTRAINT insolvency_collaterals_case_org_fk
      FOREIGN KEY (case_id, organization_id) REFERENCES public.cases(id, organization_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.insolvency_creditors'::regclass AND conname='insolvency_creditors_case_org_fk') THEN
    ALTER TABLE public.insolvency_creditors
      ADD CONSTRAINT insolvency_creditors_case_org_fk
      FOREIGN KEY (case_id, organization_id) REFERENCES public.cases(id, organization_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.insolvency_filing_bundles'::regclass AND conname='insolvency_filing_bundles_case_org_fk') THEN
    ALTER TABLE public.insolvency_filing_bundles
      ADD CONSTRAINT insolvency_filing_bundles_case_org_fk
      FOREIGN KEY (case_id, organization_id) REFERENCES public.cases(id, organization_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.insolvency_priority_claims'::regclass AND conname='insolvency_priority_claims_case_org_fk') THEN
    ALTER TABLE public.insolvency_priority_claims
      ADD CONSTRAINT insolvency_priority_claims_case_org_fk
      FOREIGN KEY (case_id, organization_id) REFERENCES public.cases(id, organization_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.insolvency_repayment_plans'::regclass AND conname='insolvency_repayment_plans_case_org_fk') THEN
    ALTER TABLE public.insolvency_repayment_plans
      ADD CONSTRAINT insolvency_repayment_plans_case_org_fk
      FOREIGN KEY (case_id, organization_id) REFERENCES public.cases(id, organization_id) ON DELETE CASCADE;
  END IF;
END $$;
