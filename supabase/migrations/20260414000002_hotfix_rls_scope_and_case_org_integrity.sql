-- =============================================================================
-- Forward-only hotfix (2026-04-14)
--   Purpose: DB를 앱의 case_scope 정책과 일치시키는 마지막 방어선 구축.
--
--   1. app.can_access_case(target_case uuid) 함수 신설
--      - 플랫폼 관리자 또는 의뢰인(case_client) → 무조건 허용
--      - org_owner/org_manager(management roles) → 조직 전체 사건 허용
--      - case_scope_policy='all_org_cases' 멤버 → 조직 전체 사건 허용
--      - 그 외(assigned_cases_only / read_only_assigned) → case_handlers에
--        본인 레코드가 있는 사건만 허용
--      앱의 resolveOrganizationCasePolicies / getCaseScopeAccess 와 정책 동치.
--
--   2. rehabilitation_* 10개 테이블 RLS 정책을 해당 함수 호출로 교체
--      이전 정책은 "조직 멤버만이면 전부 허용" 이어서 비배정 사용자 우회 가능.
--
--   3. cases에 UNIQUE (id, organization_id) 추가 + rehabilitation_applications,
--      rehabilitation_creditors에 (case_id, organization_id) → cases 복합 FK
--      추가. organization_id 위조로 타조직 사건에 회생 데이터 기록하는 경로 차단.
--
--   모든 DDL은 멱등(idempotent) — 이미 적용된 환경에서 재실행 안전.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. app.can_access_case
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION app.can_access_case(target_case uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    app.is_platform_admin()
    OR app.is_case_client(target_case)
    OR EXISTS (
      SELECT 1
      FROM public.cases c
      JOIN public.organization_memberships om
        ON om.organization_id = c.organization_id
       AND om.profile_id = auth.uid()
       AND om.status = 'active'
      WHERE c.id = target_case
        AND (
          om.role IN ('org_owner', 'org_manager')
          OR COALESCE(om.case_scope_policy, 'assigned_cases_only') = 'all_org_cases'
          OR EXISTS (
            SELECT 1
            FROM public.case_handlers ch
            WHERE ch.case_id = target_case
              AND ch.profile_id = auth.uid()
          )
        )
    );
$function$;

COMMENT ON FUNCTION app.can_access_case(uuid) IS
  'Mirrors app-side getCaseScopeAccess: platform admin, case client, management roles, or all_org_cases policy get org-wide access; otherwise requires case_handlers row.';

-- -----------------------------------------------------------------------------
-- 2. rehabilitation_* RLS 정책 교체
-- -----------------------------------------------------------------------------

-- rehabilitation_applications
DROP POLICY IF EXISTS rehab_app_org_member ON public.rehabilitation_applications;
CREATE POLICY rehab_app_case_access ON public.rehabilitation_applications
  AS PERMISSIVE FOR ALL TO authenticated
  USING (app.can_access_case(case_id))
  WITH CHECK (app.can_access_case(case_id));

-- rehabilitation_creditor_settings
DROP POLICY IF EXISTS rehab_cred_settings_org_member ON public.rehabilitation_creditor_settings;
CREATE POLICY rehab_cred_settings_case_access ON public.rehabilitation_creditor_settings
  AS PERMISSIVE FOR ALL TO authenticated
  USING (app.can_access_case(case_id))
  WITH CHECK (app.can_access_case(case_id));

-- rehabilitation_secured_properties
DROP POLICY IF EXISTS rehab_secured_org_member ON public.rehabilitation_secured_properties;
CREATE POLICY rehab_secured_case_access ON public.rehabilitation_secured_properties
  AS PERMISSIVE FOR ALL TO authenticated
  USING (app.can_access_case(case_id))
  WITH CHECK (app.can_access_case(case_id));

-- rehabilitation_creditors
DROP POLICY IF EXISTS rehab_creditors_org_member ON public.rehabilitation_creditors;
CREATE POLICY rehab_creditors_case_access ON public.rehabilitation_creditors
  AS PERMISSIVE FOR ALL TO authenticated
  USING (app.can_access_case(case_id))
  WITH CHECK (app.can_access_case(case_id));

-- rehabilitation_properties
DROP POLICY IF EXISTS rehab_properties_org_member ON public.rehabilitation_properties;
CREATE POLICY rehab_properties_case_access ON public.rehabilitation_properties
  AS PERMISSIVE FOR ALL TO authenticated
  USING (app.can_access_case(case_id))
  WITH CHECK (app.can_access_case(case_id));

-- rehabilitation_property_deductions
DROP POLICY IF EXISTS rehab_prop_deductions_org_member ON public.rehabilitation_property_deductions;
CREATE POLICY rehab_prop_deductions_case_access ON public.rehabilitation_property_deductions
  AS PERMISSIVE FOR ALL TO authenticated
  USING (app.can_access_case(case_id))
  WITH CHECK (app.can_access_case(case_id));

-- rehabilitation_family_members
DROP POLICY IF EXISTS rehab_family_org_member ON public.rehabilitation_family_members;
CREATE POLICY rehab_family_case_access ON public.rehabilitation_family_members
  AS PERMISSIVE FOR ALL TO authenticated
  USING (app.can_access_case(case_id))
  WITH CHECK (app.can_access_case(case_id));

-- rehabilitation_income_settings
DROP POLICY IF EXISTS rehab_income_org_member ON public.rehabilitation_income_settings;
CREATE POLICY rehab_income_case_access ON public.rehabilitation_income_settings
  AS PERMISSIVE FOR ALL TO authenticated
  USING (app.can_access_case(case_id))
  WITH CHECK (app.can_access_case(case_id));

-- rehabilitation_affidavits
DROP POLICY IF EXISTS rehab_affidavit_org_member ON public.rehabilitation_affidavits;
CREATE POLICY rehab_affidavit_case_access ON public.rehabilitation_affidavits
  AS PERMISSIVE FOR ALL TO authenticated
  USING (app.can_access_case(case_id))
  WITH CHECK (app.can_access_case(case_id));

-- rehabilitation_plan_sections
DROP POLICY IF EXISTS rehab_plan_org_member ON public.rehabilitation_plan_sections;
CREATE POLICY rehab_plan_case_access ON public.rehabilitation_plan_sections
  AS PERMISSIVE FOR ALL TO authenticated
  USING (app.can_access_case(case_id))
  WITH CHECK (app.can_access_case(case_id));

-- rehabilitation_prohibition_orders (일부 환경에서 드리프트로 누락 가능 — 존재할 때만 갱신)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='rehabilitation_prohibition_orders') THEN
    EXECUTE 'DROP POLICY IF EXISTS rehab_prohibition_org_member ON public.rehabilitation_prohibition_orders';
    EXECUTE $ddl$
      CREATE POLICY rehab_prohibition_case_access ON public.rehabilitation_prohibition_orders
        AS PERMISSIVE FOR ALL TO authenticated
        USING (app.can_access_case(case_id))
        WITH CHECK (app.can_access_case(case_id))
    $ddl$;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. 복합 무결성 — (case_id, organization_id) ↔ cases(id, organization_id)
-- -----------------------------------------------------------------------------

-- cases에 복합 UNIQUE 추가 (복합 FK 참조 대상으로 필요)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.cases'::regclass
      AND conname = 'cases_id_organization_id_key'
  ) THEN
    ALTER TABLE public.cases
      ADD CONSTRAINT cases_id_organization_id_key UNIQUE (id, organization_id);
  END IF;
END $$;

-- rehabilitation_applications 복합 FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.rehabilitation_applications'::regclass
      AND conname = 'rehab_applications_case_org_fk'
  ) THEN
    ALTER TABLE public.rehabilitation_applications
      ADD CONSTRAINT rehab_applications_case_org_fk
      FOREIGN KEY (case_id, organization_id)
      REFERENCES public.cases (id, organization_id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- rehabilitation_creditors 복합 FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.rehabilitation_creditors'::regclass
      AND conname = 'rehab_creditors_case_org_fk'
  ) THEN
    ALTER TABLE public.rehabilitation_creditors
      ADD CONSTRAINT rehab_creditors_case_org_fk
      FOREIGN KEY (case_id, organization_id)
      REFERENCES public.cases (id, organization_id)
      ON DELETE CASCADE;
  END IF;
END $$;
