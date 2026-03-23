-- 0077: soft-delete support for case_documents, billing_entries, fee_agreements
-- Add deleted_at column to enable soft-delete instead of hard-delete.
-- Add original_case_status to cases so restore can bring back the exact prior status.

-- case_documents
alter table public.case_documents
  add column if not exists deleted_at timestamptz default null,
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null;

create index if not exists idx_case_documents_deleted_at
  on public.case_documents (deleted_at)
  where deleted_at is null;

-- billing_entries
alter table public.billing_entries
  add column if not exists deleted_at timestamptz default null,
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null;

create index if not exists idx_billing_entries_deleted_at
  on public.billing_entries (deleted_at)
  where deleted_at is null;

-- fee_agreements
alter table public.fee_agreements
  add column if not exists deleted_at timestamptz default null,
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null;

create index if not exists idx_fee_agreements_deleted_at
  on public.fee_agreements (deleted_at)
  where deleted_at is null;

-- cases: save original case_status before soft-delete so restore is exact
alter table public.cases
  add column if not exists original_case_status public.case_status default null;
