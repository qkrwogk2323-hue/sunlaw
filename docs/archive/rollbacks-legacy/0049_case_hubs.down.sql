-- Rollback: 0049_case_hubs.sql
-- Drops case hub tables and all dependent objects.
-- WARNING: This destroys all case hub data. Run only on staging or with a backup.

drop table if exists public.case_hub_activity cascade;
drop table if exists public.case_hub_members cascade;
drop table if exists public.case_hubs cascade;
