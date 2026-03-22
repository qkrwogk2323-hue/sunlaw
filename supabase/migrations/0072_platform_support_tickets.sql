create table if not exists public.platform_support_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  requester_profile_id uuid not null references public.profiles(id) on delete cascade,
  requester_name_snapshot text not null,
  requester_email_snapshot citext not null,
  organization_name_snapshot text,
  category text not null default 'question',
  title text not null,
  body text not null,
  status text not null default 'received',
  handled_by_profile_id uuid references public.profiles(id) on delete set null,
  handled_by_name text,
  handled_note text,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_platform_support_tickets_requester
  on public.platform_support_tickets (requester_profile_id, created_at desc);

create index if not exists idx_platform_support_tickets_status
  on public.platform_support_tickets (status, created_at desc);

drop trigger if exists trg_platform_support_tickets_updated_at on public.platform_support_tickets;
create trigger trg_platform_support_tickets_updated_at
before update on public.platform_support_tickets
for each row execute procedure app.set_updated_at();

alter table public.platform_support_tickets enable row level security;
alter table public.platform_support_tickets force row level security;

drop policy if exists platform_support_tickets_select on public.platform_support_tickets;
create policy platform_support_tickets_select on public.platform_support_tickets
for select to authenticated
using (requester_profile_id = auth.uid() or app.is_platform_admin());

drop policy if exists platform_support_tickets_insert on public.platform_support_tickets;
create policy platform_support_tickets_insert on public.platform_support_tickets
for insert to authenticated
with check (requester_profile_id = auth.uid());

drop policy if exists platform_support_tickets_update on public.platform_support_tickets;
create policy platform_support_tickets_update on public.platform_support_tickets
for update to authenticated
using (app.is_platform_admin())
with check (app.is_platform_admin());

drop trigger if exists audit_platform_support_tickets on public.platform_support_tickets;
create trigger audit_platform_support_tickets
after insert or update or delete on public.platform_support_tickets
for each row execute procedure audit.capture_row_change();
