insert into storage.buckets (id, name, public)
values ('organization-signup-documents', 'organization-signup-documents', false)
on conflict (id) do nothing;

alter table if exists public.organization_signup_requests
  add column if not exists business_registration_document_path text,
  add column if not exists business_registration_document_name text,
  add column if not exists business_registration_document_mime_type text,
  add column if not exists business_registration_document_size integer,
  add column if not exists business_registration_verification_status text not null default 'pending_review',
  add column if not exists business_registration_verification_note text,
  add column if not exists business_registration_verified_number text,
  add column if not exists business_registration_verified_at timestamptz;

alter table if exists public.organization_signup_requests
  drop constraint if exists organization_signup_requests_business_registration_verification_status_check;

alter table if exists public.organization_signup_requests
  add constraint organization_signup_requests_business_registration_verification_status_check
  check (business_registration_verification_status in ('pending_review', 'matched', 'mismatch', 'unreadable'));

create index if not exists idx_org_signup_requests_verification_status
on public.organization_signup_requests (business_registration_verification_status, created_at desc);

notify pgrst, 'reload schema';