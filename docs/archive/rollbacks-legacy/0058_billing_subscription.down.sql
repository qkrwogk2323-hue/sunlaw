-- Rollback: 0058_billing_subscription_lock_state_machine.sql

drop table if exists public.billing_subscription_events cascade;
drop table if exists public.organization_subscription_states cascade;
