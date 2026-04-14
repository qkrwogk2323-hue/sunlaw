-- Rollback: 0055_case_hub_multi_org_bridge.sql

drop policy if exists case_hub_organizations_select on public.case_hub_organizations;
drop policy if exists case_hub_organizations_service_role_all on public.case_hub_organizations;
drop table if exists public.case_hub_organizations cascade;
