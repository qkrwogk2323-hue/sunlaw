-- Prepare organization_kind for platform management locking.
-- The enum value must be committed in its own migration before it can be used safely.

do $$
begin
  alter type public.organization_kind add value 'platform_management';
exception
  when duplicate_object then null;
end $$;
