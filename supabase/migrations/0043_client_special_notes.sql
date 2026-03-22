create table if not exists public.client_special_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid references public.cases(id) on delete set null,
  case_client_id uuid references public.case_clients(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  note_type text not null default 'special'
    check (note_type in ('special', 'phone_window', 'request', 'response', 'hub')),
  note_body text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_client_special_notes_org_created
  on public.client_special_notes (organization_id, created_at desc);
create index if not exists idx_client_special_notes_case
  on public.client_special_notes (case_id, created_at desc);
create index if not exists idx_client_special_notes_profile
  on public.client_special_notes (profile_id, created_at desc);

alter table public.client_special_notes enable row level security;
alter table public.client_special_notes force row level security;

drop policy if exists client_special_notes_select on public.client_special_notes;
create policy client_special_notes_select on public.client_special_notes
for select to authenticated
using (app.is_platform_admin() or app.is_org_staff(organization_id));

drop policy if exists client_special_notes_insert on public.client_special_notes;
create policy client_special_notes_insert on public.client_special_notes
for insert to authenticated
with check (app.is_platform_admin() or app.is_org_staff(organization_id));

drop policy if exists client_special_notes_update on public.client_special_notes;
create policy client_special_notes_update on public.client_special_notes
for update to authenticated
using (app.is_platform_admin() or app.is_org_manager(organization_id))
with check (app.is_platform_admin() or app.is_org_manager(organization_id));

drop trigger if exists trg_client_special_notes_updated_at on public.client_special_notes;
create trigger trg_client_special_notes_updated_at
before update on public.client_special_notes
for each row execute function app.set_updated_at();


drop trigger if exists audit_client_special_notes on public.client_special_notes;
create trigger audit_client_special_notes
  after insert or update or delete on public.client_special_notes
  for each row execute procedure audit.capture_row_change();
