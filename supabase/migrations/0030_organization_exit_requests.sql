create table if not exists public.organization_exit_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  reviewed_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_org_exit_requests_org on public.organization_exit_requests(organization_id, status, created_at desc);
create index if not exists idx_org_exit_requests_status on public.organization_exit_requests(status, created_at desc);

create or replace function public.touch_org_exit_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trg_org_exit_requests_updated_at on public.organization_exit_requests;
create trigger trg_org_exit_requests_updated_at
before update on public.organization_exit_requests
for each row execute procedure public.touch_org_exit_requests_updated_at();
