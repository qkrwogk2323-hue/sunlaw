-- =============================================================================
-- Forward-only hotfix (2026-04-14)
--   지시서 DIRECTIVE_RESOLVE_CHAOS.md 4.2, 6.2 집행:
--   case_* / insolvency_* RLS를 app.can_access_case 기준으로 전면 통일.
--
--   기존 정책의 공통 결함:
--     - 'is_org_staff(organization_id)'만 검사 → 같은 조직의 비배정 사용자도 통과
--     - case_scope_policy='assigned_cases_only'가 DB 차원에서 집행되지 않음
--
--   새 기준:
--     - 스태프 쓰기/조회 경로: (app.can_access_case(case_id) AND NOT app.is_case_client(case_id))
--     - 의뢰인(portal) 경로: app.is_case_client(case_id) + 기존 가시성 필터(client_visibility/client_visible/is_internal)
--     - platform_admin 경로는 유지
--     - service_role 정책이 있는 테이블은 그대로 보존
--
--   의뢰인 포털 호환을 위해 client_visibility·is_internal·client_visible 등
--   기존 가시성 플래그는 그대로 존중한다. 이 정책은 스태프 경로에만 scope 필터를
--   추가하는 것이며, 의뢰인 접근 범위는 변하지 않는다.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. 스태프-전용 테이블 (의뢰인 접근 없음)
-- -----------------------------------------------------------------------------

-- case_handlers
DROP POLICY IF EXISTS case_handlers_select ON public.case_handlers;
DROP POLICY IF EXISTS case_handlers_write ON public.case_handlers;
CREATE POLICY case_handlers_case_access ON public.case_handlers
  AS PERMISSIVE FOR ALL TO authenticated
  USING (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)))
  WITH CHECK (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)));

-- case_parties
DROP POLICY IF EXISTS case_parties_select ON public.case_parties;
DROP POLICY IF EXISTS case_parties_write ON public.case_parties;
CREATE POLICY case_parties_case_access ON public.case_parties
  AS PERMISSIVE FOR ALL TO authenticated
  USING (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)))
  WITH CHECK (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)));

-- case_document_reviews
DROP POLICY IF EXISTS case_document_reviews_select ON public.case_document_reviews;
DROP POLICY IF EXISTS case_document_reviews_insert ON public.case_document_reviews;
CREATE POLICY case_document_reviews_case_access ON public.case_document_reviews
  AS PERMISSIVE FOR ALL TO authenticated
  USING (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)))
  WITH CHECK (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)));

-- case_organizations: SELECT를 case 접근 기준으로 확대, WRITE는 기존 org_manager 유지
DROP POLICY IF EXISTS case_organizations_select ON public.case_organizations;
CREATE POLICY case_organizations_read ON public.case_organizations
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (app.is_platform_admin() OR app.can_access_case(case_id));
-- NOTE: case_organizations_write (org_manager) 기존 정책 유지

-- insolvency_creditors
DROP POLICY IF EXISTS insolvency_creditors_select ON public.insolvency_creditors;
DROP POLICY IF EXISTS insolvency_creditors_write ON public.insolvency_creditors;
CREATE POLICY insolvency_creditors_case_access ON public.insolvency_creditors
  AS PERMISSIVE FOR ALL TO authenticated
  USING (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)))
  WITH CHECK (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)));

-- insolvency_collaterals
DROP POLICY IF EXISTS insolvency_collaterals_select ON public.insolvency_collaterals;
DROP POLICY IF EXISTS insolvency_collaterals_write ON public.insolvency_collaterals;
CREATE POLICY insolvency_collaterals_case_access ON public.insolvency_collaterals
  AS PERMISSIVE FOR ALL TO authenticated
  USING (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)))
  WITH CHECK (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)));

-- insolvency_filing_bundles
DROP POLICY IF EXISTS filing_bundles_select ON public.insolvency_filing_bundles;
DROP POLICY IF EXISTS filing_bundles_write ON public.insolvency_filing_bundles;
CREATE POLICY filing_bundles_case_access ON public.insolvency_filing_bundles
  AS PERMISSIVE FOR ALL TO authenticated
  USING (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)))
  WITH CHECK (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)));

-- insolvency_priority_claims
DROP POLICY IF EXISTS priority_claims_select ON public.insolvency_priority_claims;
DROP POLICY IF EXISTS priority_claims_write ON public.insolvency_priority_claims;
CREATE POLICY priority_claims_case_access ON public.insolvency_priority_claims
  AS PERMISSIVE FOR ALL TO authenticated
  USING (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)))
  WITH CHECK (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)));

-- insolvency_repayment_plans
DROP POLICY IF EXISTS repayment_plans_select ON public.insolvency_repayment_plans;
DROP POLICY IF EXISTS repayment_plans_write ON public.insolvency_repayment_plans;
CREATE POLICY repayment_plans_case_access ON public.insolvency_repayment_plans
  AS PERMISSIVE FOR ALL TO authenticated
  USING (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)))
  WITH CHECK (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)));

-- -----------------------------------------------------------------------------
-- 2. 하이브리드 — 의뢰인 포털이 일부 행을 읽는 테이블
-- -----------------------------------------------------------------------------

-- case_clients: SELECT는 스태프(+scope) 또는 본인(profile_id=auth.uid()); WRITE는 스태프 전용
DROP POLICY IF EXISTS case_clients_select ON public.case_clients;
DROP POLICY IF EXISTS case_clients_write ON public.case_clients;
CREATE POLICY case_clients_read ON public.case_clients
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    app.is_platform_admin()
    OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id))
    OR profile_id = auth.uid()
  );
CREATE POLICY case_clients_write ON public.case_clients
  AS PERMISSIVE FOR ALL TO authenticated
  USING (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)))
  WITH CHECK (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)));

-- case_recovery_activities: 스태프 + 의뢰인(client_visibility='client_visible')
DROP POLICY IF EXISTS case_recovery_select ON public.case_recovery_activities;
DROP POLICY IF EXISTS case_recovery_write ON public.case_recovery_activities;
CREATE POLICY case_recovery_read ON public.case_recovery_activities
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    app.is_platform_admin()
    OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id))
    OR (app.is_case_client(case_id) AND client_visibility = 'client_visible'::client_visibility)
  );
CREATE POLICY case_recovery_write ON public.case_recovery_activities
  AS PERMISSIVE FOR ALL TO authenticated
  USING (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)))
  WITH CHECK (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)));

-- case_schedules: 스태프 + 의뢰인(client_visibility='client_visible')
DROP POLICY IF EXISTS case_schedules_select ON public.case_schedules;
DROP POLICY IF EXISTS case_schedules_write ON public.case_schedules;
CREATE POLICY case_schedules_read ON public.case_schedules
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    app.is_platform_admin()
    OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id))
    OR (app.is_case_client(case_id) AND client_visibility = 'client_visible'::client_visibility)
  );
CREATE POLICY case_schedules_write ON public.case_schedules
  AS PERMISSIVE FOR ALL TO authenticated
  USING (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)))
  WITH CHECK (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)));

-- case_documents: 스태프 + 의뢰인(client_visibility='client_visible')
DROP POLICY IF EXISTS case_documents_select ON public.case_documents;
DROP POLICY IF EXISTS case_documents_write ON public.case_documents;
CREATE POLICY case_documents_read ON public.case_documents
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    app.is_platform_admin()
    OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id))
    OR (app.is_case_client(case_id) AND client_visibility = 'client_visible'::client_visibility)
  );
CREATE POLICY case_documents_write ON public.case_documents
  AS PERMISSIVE FOR ALL TO authenticated
  USING (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)))
  WITH CHECK (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)));

-- case_messages: 스태프 + 의뢰인(is_internal=false); INSERT는 sender=auth.uid() 강제
DROP POLICY IF EXISTS case_messages_select ON public.case_messages;
DROP POLICY IF EXISTS case_messages_insert ON public.case_messages;
CREATE POLICY case_messages_read ON public.case_messages
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    app.is_platform_admin()
    OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id))
    OR (app.is_case_client(case_id) AND is_internal = false)
  );
CREATE POLICY case_messages_insert ON public.case_messages
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    sender_profile_id = auth.uid()
    AND (
      (app.can_access_case(case_id) AND NOT app.is_case_client(case_id))
      OR (app.is_case_client(case_id) AND is_internal = false)
    )
  );

-- case_requests: 스태프 + 의뢰인(client_visible=true); INSERT는 created_by=auth.uid() 강제
DROP POLICY IF EXISTS case_requests_select ON public.case_requests;
DROP POLICY IF EXISTS case_requests_insert ON public.case_requests;
DROP POLICY IF EXISTS case_requests_update ON public.case_requests;
CREATE POLICY case_requests_read ON public.case_requests
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    app.is_platform_admin()
    OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id))
    OR (app.is_case_client(case_id) AND client_visible = true)
  );
CREATE POLICY case_requests_insert ON public.case_requests
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      (app.can_access_case(case_id) AND NOT app.is_case_client(case_id))
      OR (app.is_case_client(case_id) AND client_visible = true)
    )
  );
CREATE POLICY case_requests_update ON public.case_requests
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)))
  WITH CHECK (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)));

-- case_request_attachments: case_requests 가시성 상속
DROP POLICY IF EXISTS case_request_files_select ON public.case_request_attachments;
DROP POLICY IF EXISTS case_request_files_insert ON public.case_request_attachments;
CREATE POLICY case_request_attachments_read ON public.case_request_attachments
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    app.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.case_requests r
      WHERE r.id = case_request_attachments.case_request_id
        AND (
          (app.can_access_case(r.case_id) AND NOT app.is_case_client(r.case_id))
          OR (app.is_case_client(r.case_id) AND r.client_visible = true)
        )
    )
  );
CREATE POLICY case_request_attachments_insert ON public.case_request_attachments
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    app.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.case_requests r
      WHERE r.id = case_request_attachments.case_request_id
        AND (
          (app.can_access_case(r.case_id) AND NOT app.is_case_client(r.case_id))
          OR (app.is_case_client(r.case_id) AND r.client_visible = true)
        )
    )
  );

-- insolvency_client_action_items: 의뢰인이 자기 액션 아이템 읽을 수 있어야 함
DROP POLICY IF EXISTS action_items_select ON public.insolvency_client_action_items;
DROP POLICY IF EXISTS action_items_staff_write ON public.insolvency_client_action_items;
CREATE POLICY action_items_read ON public.insolvency_client_action_items
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (app.is_platform_admin() OR app.can_access_case(case_id));
CREATE POLICY action_items_staff_write ON public.insolvency_client_action_items
  AS PERMISSIVE FOR ALL TO authenticated
  USING (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)))
  WITH CHECK (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)));

-- insolvency_client_action_packets: 동일 패턴
DROP POLICY IF EXISTS action_packets_select ON public.insolvency_client_action_packets;
DROP POLICY IF EXISTS action_packets_write ON public.insolvency_client_action_packets;
CREATE POLICY action_packets_read ON public.insolvency_client_action_packets
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (app.is_platform_admin() OR app.can_access_case(case_id));
CREATE POLICY action_packets_write ON public.insolvency_client_action_packets
  AS PERMISSIVE FOR ALL TO authenticated
  USING (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)))
  WITH CHECK (app.is_platform_admin() OR (app.can_access_case(case_id) AND NOT app.is_case_client(case_id)));

-- -----------------------------------------------------------------------------
-- 3. 범위 제외 (의도)
--   case_hubs — 별도의 case_hub_org_member 기반 정책 유지
--   case_party_private_profiles — 이미 더 엄격함(platform admin + org_manager)
--   case_module_catalog / case_stage_* / case_type_default_modules — 참조 데이터
--   cases — 별도 정책 체계
--   insolvency_ruleset_constants / insolvency_creditor_addresses /
--   insolvency_repayment_allocations — case_id 없음, 별도 파생 정책 필요
-- =============================================================================
