alter table public.case_hubs
  add column if not exists access_pin_enabled boolean not null default false,
  add column if not exists access_pin_hash text;

alter table public.organization_collaboration_hubs
  add column if not exists access_pin_enabled boolean not null default false,
  add column if not exists access_pin_hash text;
