-- Rollback: 0050_finalize_single_platform_root_to_vein_bn_1.sql
-- Removes the constraints/defaults that lock the platform root org.
-- Re-check 0050 migration carefully before  column changes vary.applying 
-- Minimal safe rollback: drop the is_platform_root unique index if added.
-- NOTE: Restoring dropped constraints requires knowing prior state. Manual review required.
-- This file serves as a reminder checklist; do NOT apply blindly.

-- Example pattern (adjust based on actual 0050 content):
-- alter table public.organizations drop constraint if exists <constraint_name>;
select 'Review supabase/migrations/0050_finalize_single_platform_root_to_vein_bn_1.sql before applying rollback' as warning;
