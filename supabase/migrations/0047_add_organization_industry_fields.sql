alter table public.organization_signup_requests
  add column if not exists organization_industry text;

alter table public.organizations
  add column if not exists organization_industry text;
