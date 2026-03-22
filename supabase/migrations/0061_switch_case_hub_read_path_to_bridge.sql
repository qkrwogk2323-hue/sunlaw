-- 0061: case_hubs / case_hub_members / case_hub_activity read path를 bridge 기반으로 전환
-- 목적:
-- 0049에서 정의된 RLS select 정책이 아직 case_hubs.organization_id (single-org 모델) 기준.
-- 0055/0060에서 canonical source가 case_hub_organizations(bridge)로 이전됐으므로
-- select 정책을 app.is_case_hub_org_member()로 교체해 multi-org 허브도 정상 접근 가능하게 함.

-- case_hubs select: bridge 기반으로 교체
drop policy if exists "case_hubs_org_member_select" on public.case_hubs;
create policy "case_hubs_org_member_select"
  on public.case_hubs for select
  to authenticated
  using (
    app.is_platform_admin()
    or app.is_case_hub_org_member(id)
  );

-- case_hub_members select: bridge 기반으로 교체
drop policy if exists "case_hub_members_org_select" on public.case_hub_members;
create policy "case_hub_members_org_select"
  on public.case_hub_members for select
  to authenticated
  using (
    app.is_platform_admin()
    or app.is_case_hub_org_member(hub_id)
  );

-- case_hub_activity select: bridge 기반으로 교체
drop policy if exists "case_hub_activity_org_select" on public.case_hub_activity;
create policy "case_hub_activity_org_select"
  on public.case_hub_activity for select
  to authenticated
  using (
    app.is_platform_admin()
    or app.is_case_hub_org_member(hub_id)
  );
