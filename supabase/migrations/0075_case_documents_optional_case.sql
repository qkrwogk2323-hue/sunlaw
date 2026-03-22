-- Make case_id optional on case_documents so documents can be uploaded without a case
alter table public.case_documents
  alter column case_id drop not null;

-- Update the index to reflect nullable case_id
drop index if exists public.idx_case_documents_case;
create index if not exists idx_case_documents_case on public.case_documents (organization_id, updated_at desc);
create index if not exists idx_case_documents_by_case on public.case_documents (case_id, updated_at desc) where case_id is not null;
