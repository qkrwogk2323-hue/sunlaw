-- Rollback: 0051_enable_rls_for_exit_requests_and_kakao_outbox.sql

drop policy if exists organization_exit_requests_select on public.organization_exit_requests;
drop policy if exists organization_exit_requests_insert on public.organization_exit_requests;
drop policy if exists organization_exit_requests_update on public.organization_exit_requests;
alter table public.organization_exit_requests disable row level security;

drop policy if exists kakao_notification_outbox_select on public.kakao_notification_outbox;
drop policy if exists kakao_notification_outbox_write on public.kakao_notification_outbox;
alter table public.kakao_notification_outbox disable row level security;
