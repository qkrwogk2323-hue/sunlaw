-- Rollback: 0053_canonicalize_platform_governance.sql

drop trigger if exists trg_platform_runtime_settings_updated_at on public.platform_runtime_settings;
drop policy if exists platform_runtime_settings_admin_select on public.platform_runtime_settings;
drop policy if exists platform_runtime_settings_admin_write on public.platform_runtime_settings;
drop policy if exists platform_runtime_settings_service_role_all on public.platform_runtime_settings;
drop table if exists public.platform_runtime_settings cascade;
-- NOTE: Reverting organizations column additions requires knowing prior state.
-- Check 0053 for specific columns added before running.
