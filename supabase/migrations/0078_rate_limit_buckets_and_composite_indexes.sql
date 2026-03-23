-- migration 0078: DB-based rate limiting table + composite partial indexes for soft-delete queries
-- Rationale: module-level in-memory Maps are per-process and fail in serverless/multi-instance
-- environments. Supabase DB provides a shared, durable rate limit store.

-- ---------------------------------------------------------------------------
-- 1. Rate limit buckets (shared across all serverless instances)
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limit_buckets (
  id           text        primary key,        -- hash(endpoint:identifier)
  attempts     integer     not null default 1,
  window_start timestamptz not null default now(),
  expires_at   timestamptz not null
);

comment on table public.rate_limit_buckets is
  'Short-lived rate limit counters shared across serverless instances. Rows expire automatically.';

-- Index for fast expiry cleanup
create index if not exists rate_limit_buckets_expires_at_idx
  on public.rate_limit_buckets (expires_at);

-- No RLS needed: this table is only written by service-role (server actions/route handlers).
-- But we enable RLS and deny public access to be safe.
alter table public.rate_limit_buckets enable row level security;

-- Only service-role bypasses RLS; all authenticated/anon access is denied by default.
-- (No policy = deny all non-service-role access)

-- ---------------------------------------------------------------------------
-- 2. Composite partial indexes for soft-deleted tables
--    These are more selective than the single-column partial indexes from 0077.
-- ---------------------------------------------------------------------------

-- case_documents: org-scoped listing (most common query pattern)
create index if not exists case_documents_org_updated_active_idx
  on public.case_documents (organization_id, updated_at desc)
  where deleted_at is null;

-- case_documents: case-scoped listing
create index if not exists case_documents_case_created_active_idx
  on public.case_documents (case_id, created_at desc)
  where deleted_at is null;

-- billing_entries: org-scoped listing
create index if not exists billing_entries_org_updated_active_idx
  on public.billing_entries (organization_id, updated_at desc)
  where deleted_at is null;

-- billing_entries: case-scoped listing
create index if not exists billing_entries_case_created_active_idx
  on public.billing_entries (case_id, created_at desc)
  where deleted_at is null;

-- fee_agreements: case-scoped listing
create index if not exists fee_agreements_case_created_active_idx
  on public.fee_agreements (case_id, created_at desc)
  where deleted_at is null;
