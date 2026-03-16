-- P0-05A/B/C financial domains: client billing, collection compensation, inter-org settlement

do $$ begin
  alter type public.billing_entry_kind add value 'retainer_fee';
exception when duplicate_object then null; end $$;
do $$ begin
  alter type public.billing_entry_kind add value 'flat_fee';
exception when duplicate_object then null; end $$;
do $$ begin
  alter type public.billing_entry_kind add value 'court_fee';
exception when duplicate_object then null; end $$;
do $$ begin
  alter type public.billing_entry_kind add value 'service_fee';
exception when duplicate_object then null; end $$;
do $$ begin
  alter type public.billing_entry_kind add value 'discount';
exception when duplicate_object then null; end $$;
do $$ begin
  alter type public.billing_entry_kind add value 'internal_settlement';
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.billing_agreement_type as enum ('retainer', 'flat_fee', 'success_fee', 'expense_reimbursement', 'installment_plan', 'internal_settlement');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.billing_party_kind as enum ('case_client', 'case_organization');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invoice_status as enum ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled', 'written_off');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending', 'confirmed', 'reversed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('bank_transfer', 'card', 'cash', 'offset', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.compensation_target_kind as enum ('membership', 'organization');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.compensation_plan_status as enum ('draft', 'fixed', 'superseded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.compensation_entry_status as enum ('projected', 'confirmed', 'paid', 'void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.settlement_status as enum ('draft', 'confirmed', 'paid', 'void');
exception when duplicate_object then null; end $$;

alter table public.billing_entries
  add column if not exists fee_agreement_id uuid,
  add column if not exists billing_owner_case_organization_id uuid,
  add column if not exists bill_to_party_kind public.billing_party_kind,
  add column if not exists bill_to_case_client_id uuid,
  add column if not exists bill_to_case_organization_id uuid,
  add column if not exists description text,
  add column if not exists tax_amount numeric(18,2) not null default 0,
  add column if not exists source_event_type text,
  add column if not exists source_event_id uuid;

create table if not exists public.fee_agreements (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  billing_owner_case_organization_id uuid not null references public.case_organizations(id) on delete cascade,
  bill_to_party_kind public.billing_party_kind not null,
  bill_to_case_client_id uuid references public.case_clients(id) on delete set null,
  bill_to_case_organization_id uuid references public.case_organizations(id) on delete set null,
  agreement_type public.billing_agreement_type not null,
  title text not null,
  description text,
  fixed_amount numeric(18,2),
  rate numeric(8,4),
  currency_code text not null default 'KRW',
  effective_from date,
  effective_to date,
  terms_json jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  billing_owner_case_organization_id uuid not null references public.case_organizations(id) on delete cascade,
  bill_to_party_kind public.billing_party_kind not null,
  bill_to_case_client_id uuid references public.case_clients(id) on delete set null,
  bill_to_case_organization_id uuid references public.case_organizations(id) on delete set null,
  invoice_no text not null unique,
  status public.invoice_status not null default 'draft',
  title text not null,
  description text,
  subtotal_amount numeric(18,2) not null default 0,
  tax_amount numeric(18,2) not null default 0,
  total_amount numeric(18,2) not null default 0,
  issued_at timestamptz,
  due_on date,
  sent_at timestamptz,
  paid_at timestamptz,
  pdf_storage_path text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  billing_entry_id uuid references public.billing_entries(id) on delete set null,
  title text not null,
  description text,
  amount numeric(18,2) not null default 0,
  tax_amount numeric(18,2) not null default 0,
  total_amount numeric(18,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  billing_owner_case_organization_id uuid not null references public.case_organizations(id) on delete cascade,
  payer_party_kind public.billing_party_kind not null,
  payer_case_client_id uuid references public.case_clients(id) on delete set null,
  payer_case_organization_id uuid references public.case_organizations(id) on delete set null,
  payment_status public.payment_status not null default 'pending',
  payment_method public.payment_method not null default 'bank_transfer',
  amount numeric(18,2) not null default 0,
  received_at timestamptz not null,
  reference_text text,
  note text,
  confirmed_by uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  invoice_item_id uuid references public.invoice_items(id) on delete set null,
  amount numeric(18,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.collection_compensation_plans (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  collection_org_case_organization_id uuid not null references public.case_organizations(id) on delete cascade,
  target_kind public.compensation_target_kind not null,
  beneficiary_membership_id uuid references public.organization_memberships(id) on delete set null,
  beneficiary_case_organization_id uuid references public.case_organizations(id) on delete set null,
  title text not null,
  description text,
  settlement_cycle text not null default 'monthly',
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collection_compensation_plan_versions (
  id uuid primary key default gen_random_uuid(),
  collection_compensation_plan_id uuid not null references public.collection_compensation_plans(id) on delete cascade,
  status public.compensation_plan_status not null default 'draft',
  fixed_amount numeric(18,2),
  rate numeric(8,4),
  base_metric text,
  effective_from date,
  effective_to date,
  rule_json jsonb not null default '{}'::jsonb,
  fixed_by uuid references public.profiles(id) on delete set null,
  fixed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (collection_compensation_plan_id, status, effective_from)
);

create table if not exists public.collection_compensation_entries (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  collection_compensation_plan_version_id uuid not null references public.collection_compensation_plan_versions(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  calculated_from_amount numeric(18,2) not null default 0,
  calculated_amount numeric(18,2) not null default 0,
  status public.compensation_entry_status not null default 'projected',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collection_payouts (
  id uuid primary key default gen_random_uuid(),
  collection_compensation_entry_id uuid not null references public.collection_compensation_entries(id) on delete cascade,
  payout_amount numeric(18,2) not null default 0,
  payout_date date,
  reference_text text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.collection_performance_daily (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  collection_org_case_organization_id uuid not null references public.case_organizations(id) on delete cascade,
  organization_membership_id uuid references public.organization_memberships(id) on delete set null,
  performance_date date not null,
  recovered_amount numeric(18,2) not null default 0,
  expected_compensation_amount numeric(18,2) not null default 0,
  confirmed_compensation_amount numeric(18,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (case_id, collection_org_case_organization_id, organization_membership_id, performance_date)
);

create table if not exists public.org_settlement_entries (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases(id) on delete set null,
  source_case_organization_id uuid not null references public.case_organizations(id) on delete cascade,
  target_case_organization_id uuid not null references public.case_organizations(id) on delete cascade,
  status public.settlement_status not null default 'draft',
  title text not null,
  description text,
  amount numeric(18,2) not null default 0,
  due_on date,
  paid_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  alter table public.billing_entries
    add constraint billing_entries_fee_agreement_fk
    foreign key (fee_agreement_id) references public.fee_agreements(id) on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.billing_entries
    add constraint billing_entries_billing_owner_fk
    foreign key (billing_owner_case_organization_id) references public.case_organizations(id) on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.billing_entries
    add constraint billing_entries_bill_to_client_fk
    foreign key (bill_to_case_client_id) references public.case_clients(id) on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.billing_entries
    add constraint billing_entries_bill_to_org_fk
    foreign key (bill_to_case_organization_id) references public.case_organizations(id) on delete set null;
exception when duplicate_object then null; end $$;

create index if not exists idx_fee_agreements_case on public.fee_agreements (case_id, is_active);
create index if not exists idx_billing_entries_case_v2 on public.billing_entries (case_id, status, created_at desc);
create index if not exists idx_invoices_case_status on public.invoices (case_id, status, created_at desc);
create index if not exists idx_payments_case_received on public.payments (case_id, received_at desc);
create index if not exists idx_comp_plans_case on public.collection_compensation_plans (case_id, is_active);
create index if not exists idx_comp_entries_case_period on public.collection_compensation_entries (case_id, period_start desc);
create index if not exists idx_performance_daily_date on public.collection_performance_daily (performance_date desc);
create index if not exists idx_org_settlement_case_status on public.org_settlement_entries (case_id, status, created_at desc);

create or replace function app.can_view_case_billing(target_case uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    app.is_platform_admin()
    or exists (
      select 1
      from public.case_organizations co
      join public.organization_memberships om
        on om.organization_id = co.organization_id
       and om.profile_id = auth.uid()
       and om.status = 'active'
      where co.case_id = target_case
        and co.status = 'active'
        and co.billing_scope <> 'none'
        and app.has_permission(co.organization_id, 'billing_view')
    )
    or exists (
      select 1
      from public.case_clients cc
      where cc.case_id = target_case
        and cc.profile_id = auth.uid()
        and cc.is_portal_enabled = true
    )
  );
$$;



drop policy if exists billing_entries_select on public.billing_entries;
drop policy if exists billing_entries_select on public.billing_entries;
create policy billing_entries_select on public.billing_entries
for select to authenticated
using (app.can_view_case_billing(case_id));

drop policy if exists billing_entries_write on public.billing_entries;
drop policy if exists billing_entries_write on public.billing_entries;
create policy billing_entries_write on public.billing_entries
for all to authenticated
using (
  app.is_platform_admin()
  or (
    billing_owner_case_organization_id is not null
    and app.has_permission((select organization_id from public.case_organizations where id = billing_owner_case_organization_id), 'billing_issue')
  )
)
with check (
  app.is_platform_admin()
  or (
    billing_owner_case_organization_id is not null
    and app.has_permission((select organization_id from public.case_organizations where id = billing_owner_case_organization_id), 'billing_issue')
  )
);

alter table public.fee_agreements enable row level security;
alter table public.fee_agreements force row level security;
alter table public.invoices enable row level security;
alter table public.invoices force row level security;
alter table public.invoice_items enable row level security;
alter table public.invoice_items force row level security;
alter table public.payments enable row level security;
alter table public.payments force row level security;
alter table public.payment_allocations enable row level security;
alter table public.payment_allocations force row level security;
alter table public.collection_compensation_plans enable row level security;
alter table public.collection_compensation_plans force row level security;
alter table public.collection_compensation_plan_versions enable row level security;
alter table public.collection_compensation_plan_versions force row level security;
alter table public.collection_compensation_entries enable row level security;
alter table public.collection_compensation_entries force row level security;
alter table public.collection_payouts enable row level security;
alter table public.collection_payouts force row level security;
alter table public.collection_performance_daily enable row level security;
alter table public.collection_performance_daily force row level security;
alter table public.org_settlement_entries enable row level security;
alter table public.org_settlement_entries force row level security;

drop policy if exists fee_agreements_select on public.fee_agreements;
create policy fee_agreements_select on public.fee_agreements
for select to authenticated using (app.can_view_case_billing(case_id));
drop policy if exists fee_agreements_write on public.fee_agreements;
create policy fee_agreements_write on public.fee_agreements
for all to authenticated using (app.is_platform_admin() or app.has_permission((select organization_id from public.case_organizations where id = billing_owner_case_organization_id), 'billing_issue'))
with check (app.is_platform_admin() or app.has_permission((select organization_id from public.case_organizations where id = billing_owner_case_organization_id), 'billing_issue'));

drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices
for select to authenticated using (app.can_view_case_billing(case_id));
drop policy if exists invoices_write on public.invoices;
create policy invoices_write on public.invoices
for all to authenticated using (app.is_platform_admin() or app.has_permission((select organization_id from public.case_organizations where id = billing_owner_case_organization_id), 'billing_issue'))
with check (app.is_platform_admin() or app.has_permission((select organization_id from public.case_organizations where id = billing_owner_case_organization_id), 'billing_issue'));

drop policy if exists invoice_items_select on public.invoice_items;
create policy invoice_items_select on public.invoice_items
for select to authenticated using (exists (select 1 from public.invoices i where i.id = invoice_id and app.can_view_case_billing(i.case_id)));
drop policy if exists invoice_items_write on public.invoice_items;
create policy invoice_items_write on public.invoice_items
for all to authenticated using (exists (select 1 from public.invoices i join public.case_organizations co on co.id = i.billing_owner_case_organization_id where i.id = invoice_id and (app.is_platform_admin() or app.has_permission(co.organization_id, 'billing_issue'))))
with check (exists (select 1 from public.invoices i join public.case_organizations co on co.id = i.billing_owner_case_organization_id where i.id = invoice_id and (app.is_platform_admin() or app.has_permission(co.organization_id, 'billing_issue'))));

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
for select to authenticated using (app.can_view_case_billing(case_id));
drop policy if exists payments_write on public.payments;
create policy payments_write on public.payments
for all to authenticated using (app.is_platform_admin() or app.has_permission((select organization_id from public.case_organizations where id = billing_owner_case_organization_id), 'billing_payment_confirm'))
with check (app.is_platform_admin() or app.has_permission((select organization_id from public.case_organizations where id = billing_owner_case_organization_id), 'billing_payment_confirm'));

drop policy if exists payment_allocations_select on public.payment_allocations;
create policy payment_allocations_select on public.payment_allocations
for select to authenticated using (exists (select 1 from public.payments p where p.id = payment_id and app.can_view_case_billing(p.case_id)));
drop policy if exists payment_allocations_write on public.payment_allocations;
create policy payment_allocations_write on public.payment_allocations
for all to authenticated using (exists (select 1 from public.payments p join public.case_organizations co on co.id = p.billing_owner_case_organization_id where p.id = payment_id and (app.is_platform_admin() or app.has_permission(co.organization_id, 'billing_payment_confirm'))))
with check (exists (select 1 from public.payments p join public.case_organizations co on co.id = p.billing_owner_case_organization_id where p.id = payment_id and (app.is_platform_admin() or app.has_permission(co.organization_id, 'billing_payment_confirm'))));

drop policy if exists comp_plans_select on public.collection_compensation_plans;
create policy comp_plans_select on public.collection_compensation_plans
for select to authenticated using (app.is_platform_admin() or app.is_org_member((select organization_id from public.case_organizations where id = collection_org_case_organization_id)));
drop policy if exists comp_plans_write on public.collection_compensation_plans;
create policy comp_plans_write on public.collection_compensation_plans
for all to authenticated using (app.is_platform_admin() or app.has_permission((select organization_id from public.case_organizations where id = collection_org_case_organization_id), 'collection_compensation_manage_plan'))
with check (app.is_platform_admin() or app.has_permission((select organization_id from public.case_organizations where id = collection_org_case_organization_id), 'collection_compensation_manage_plan'));

drop policy if exists comp_plan_versions_select on public.collection_compensation_plan_versions;
create policy comp_plan_versions_select on public.collection_compensation_plan_versions
for select to authenticated using (exists (select 1 from public.collection_compensation_plans p where p.id = collection_compensation_plan_id and (app.is_platform_admin() or app.is_org_member((select organization_id from public.case_organizations where id = p.collection_org_case_organization_id)))));
drop policy if exists comp_plan_versions_write on public.collection_compensation_plan_versions;
create policy comp_plan_versions_write on public.collection_compensation_plan_versions
for all to authenticated using (exists (select 1 from public.collection_compensation_plans p join public.case_organizations co on co.id = p.collection_org_case_organization_id where p.id = collection_compensation_plan_id and (app.is_platform_admin() or app.has_permission(co.organization_id, 'collection_compensation_fix_plan'))))
with check (exists (select 1 from public.collection_compensation_plans p join public.case_organizations co on co.id = p.collection_org_case_organization_id where p.id = collection_compensation_plan_id and (app.is_platform_admin() or app.has_permission(co.organization_id, 'collection_compensation_fix_plan'))));

drop policy if exists comp_entries_select on public.collection_compensation_entries;
create policy comp_entries_select on public.collection_compensation_entries
for select to authenticated using (exists (select 1 from public.collection_compensation_plan_versions v join public.collection_compensation_plans p on p.id = v.collection_compensation_plan_id join public.case_organizations co on co.id = p.collection_org_case_organization_id where v.id = collection_compensation_plan_version_id and (app.is_platform_admin() or app.is_org_member(co.organization_id))));
drop policy if exists comp_entries_write on public.collection_compensation_entries;
create policy comp_entries_write on public.collection_compensation_entries
for all to authenticated using (exists (select 1 from public.collection_compensation_plan_versions v join public.collection_compensation_plans p on p.id = v.collection_compensation_plan_id join public.case_organizations co on co.id = p.collection_org_case_organization_id where v.id = collection_compensation_plan_version_id and (app.is_platform_admin() or app.has_permission(co.organization_id, 'collection_compensation_manage_plan'))))
with check (exists (select 1 from public.collection_compensation_plan_versions v join public.collection_compensation_plans p on p.id = v.collection_compensation_plan_id join public.case_organizations co on co.id = p.collection_org_case_organization_id where v.id = collection_compensation_plan_version_id and (app.is_platform_admin() or app.has_permission(co.organization_id, 'collection_compensation_manage_plan'))));

drop policy if exists comp_payouts_select on public.collection_payouts;
create policy comp_payouts_select on public.collection_payouts
for select to authenticated using (exists (select 1 from public.collection_compensation_entries e where e.id = collection_compensation_entry_id));
drop policy if exists comp_payouts_write on public.collection_payouts;
create policy comp_payouts_write on public.collection_payouts
for all to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());

drop policy if exists performance_daily_select on public.collection_performance_daily;
create policy performance_daily_select on public.collection_performance_daily
for select to authenticated using (app.is_platform_admin() or app.is_org_member((select organization_id from public.case_organizations where id = collection_org_case_organization_id)));
drop policy if exists performance_daily_write on public.collection_performance_daily;
create policy performance_daily_write on public.collection_performance_daily
for all to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());

drop policy if exists org_settlement_entries_select on public.org_settlement_entries;
create policy org_settlement_entries_select on public.org_settlement_entries
for select to authenticated using (
  app.is_platform_admin()
  or exists (select 1 from public.case_organizations co where co.id = source_case_organization_id and app.is_org_member(co.organization_id))
  or exists (select 1 from public.case_organizations co where co.id = target_case_organization_id and app.is_org_member(co.organization_id))
);
drop policy if exists org_settlement_entries_write on public.org_settlement_entries;
create policy org_settlement_entries_write on public.org_settlement_entries
for all to authenticated using (app.is_platform_admin() or app.has_permission((select organization_id from public.case_organizations where id = source_case_organization_id), 'settlement_manage'))
with check (app.is_platform_admin() or app.has_permission((select organization_id from public.case_organizations where id = source_case_organization_id), 'settlement_manage'));

-- updated_at triggers
drop trigger if exists trg_fee_agreements_updated_at on public.fee_agreements;
create trigger trg_fee_agreements_updated_at before update on public.fee_agreements for each row execute procedure app.set_updated_at();
drop trigger if exists trg_invoices_updated_at on public.invoices;
create trigger trg_invoices_updated_at before update on public.invoices for each row execute procedure app.set_updated_at();
drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at before update on public.payments for each row execute procedure app.set_updated_at();
drop trigger if exists trg_comp_plans_updated_at on public.collection_compensation_plans;
create trigger trg_comp_plans_updated_at before update on public.collection_compensation_plans for each row execute procedure app.set_updated_at();
drop trigger if exists trg_comp_entries_updated_at on public.collection_compensation_entries;
create trigger trg_comp_entries_updated_at before update on public.collection_compensation_entries for each row execute procedure app.set_updated_at();
drop trigger if exists trg_org_settlement_entries_updated_at on public.org_settlement_entries;
create trigger trg_org_settlement_entries_updated_at before update on public.org_settlement_entries for each row execute procedure app.set_updated_at();

-- audit triggers
drop trigger if exists audit_fee_agreements on public.fee_agreements;
create trigger audit_fee_agreements after insert or update or delete on public.fee_agreements for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_invoices on public.invoices;
create trigger audit_invoices after insert or update or delete on public.invoices for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_invoice_items on public.invoice_items;
create trigger audit_invoice_items after insert or update or delete on public.invoice_items for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_payments on public.payments;
create trigger audit_payments after insert or update or delete on public.payments for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_payment_allocations on public.payment_allocations;
create trigger audit_payment_allocations after insert or update or delete on public.payment_allocations for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_collection_compensation_plans on public.collection_compensation_plans;
create trigger audit_collection_compensation_plans after insert or update or delete on public.collection_compensation_plans for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_collection_comp_plan_versions on public.collection_compensation_plan_versions;
create trigger audit_collection_comp_plan_versions after insert or update or delete on public.collection_compensation_plan_versions for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_collection_comp_entries on public.collection_compensation_entries;
create trigger audit_collection_comp_entries after insert or update or delete on public.collection_compensation_entries for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_collection_payouts on public.collection_payouts;
create trigger audit_collection_payouts after insert or update or delete on public.collection_payouts for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_collection_performance_daily on public.collection_performance_daily;
create trigger audit_collection_performance_daily after insert or update or delete on public.collection_performance_daily for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_org_settlement_entries on public.org_settlement_entries;
create trigger audit_org_settlement_entries after insert or update or delete on public.org_settlement_entries for each row execute procedure audit.capture_row_change();
