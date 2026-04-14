-- Rollback: 0057_platform_governance_registry_guards.sql

drop trigger if exists trg_platform_runtime_registry_sync on public.platform_runtime_settings;
drop trigger if exists trg_platform_registry_drift_guard on public.organizations;
