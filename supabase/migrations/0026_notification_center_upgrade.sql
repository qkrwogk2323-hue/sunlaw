alter table public.notifications
  add column if not exists requires_action boolean not null default false,
  add column if not exists resolved_at timestamptz,
  add column if not exists action_label text,
  add column if not exists action_href text,
  add column if not exists action_entity_type text,
  add column if not exists action_target_id uuid,
  add column if not exists trashed_at timestamptz,
  add column if not exists trashed_by uuid references public.profiles(id) on delete set null;

create index if not exists notifications_recipient_active_idx
  on public.notifications (recipient_profile_id, created_at desc)
  where trashed_at is null;

create index if not exists notifications_recipient_trash_idx
  on public.notifications (recipient_profile_id, trashed_at desc)
  where trashed_at is not null;

create index if not exists notifications_action_pending_idx
  on public.notifications (recipient_profile_id, organization_id, action_entity_type, action_target_id)
  where requires_action = true and resolved_at is null;

drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
for delete to authenticated
using (recipient_profile_id = auth.uid() or app.is_platform_admin());