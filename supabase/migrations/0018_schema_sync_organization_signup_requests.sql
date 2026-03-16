-- Ensure organization_signup_requests matches current app expectations

do $$ begin
  create type public.organization_kind as enum (
    'law_firm',
    'collection_company',
    'mixed_practice',
    'corporate_legal_team',
    'other'
  );
exception when duplicate_object then null; end $$;

alter table if exists public.organization_signup_requests
  add column if not exists organization_kind public.organization_kind;

alter table if exists public.organization_signup_requests
  add column if not exists website_url text,
  add column if not exists requested_modules jsonb not null default '[]'::jsonb,
  add column if not exists approved_organization_id uuid references public.organizations(id) on delete set null;

update public.organization_signup_requests
set organization_kind = 'law_firm'::public.organization_kind
where organization_kind is null;

alter table if exists public.organization_signup_requests
  alter column organization_kind set default 'law_firm'::public.organization_kind;

alter table if exists public.organization_signup_requests
  alter column organization_kind set not null;

create index if not exists idx_org_signup_requests_kind_status
on public.organization_signup_requests (organization_kind, status, created_at desc);

notify pgrst, 'reload schema';
