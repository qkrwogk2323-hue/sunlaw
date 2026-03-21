-- Rollback: 0056_client_link_lifecycle.sql
-- Removes columns added to case_clients and case_hubs.

drop index if exists public.idx_case_clients_case_link_status;
drop index if exists public.idx_case_clients_orphan_review_deadline;
drop index if exists public.idx_case_clients_last_linked_hub_id;
drop index if exists public.idx_case_hubs_primary_case_client_id;

alter table public.case_clients
  drop column if exists case_link_status,
  drop column if exists orphan_review_deadline,
  drop column if exists last_linked_hub_id;

alter table public.case_hubs
  drop column if exists primary_case_client_id;
