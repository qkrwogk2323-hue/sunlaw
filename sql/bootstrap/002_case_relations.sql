-- FK: cases
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_case_interests_case') then
    alter table public.test_case_interests
      add constraint fk_case_interests_case
      foreign key (case_id) references public.test_cases(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_case_expenses_case') then
    alter table public.test_case_expenses
      add constraint fk_case_expenses_case
      foreign key (case_id) references public.test_cases(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_case_clients_case') then
    alter table public.test_case_clients
      add constraint fk_case_clients_case
      foreign key (case_id) references public.test_cases(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_case_clients_individual') then
    alter table public.test_case_clients
      add constraint fk_case_clients_individual
      foreign key (individual_id) references public.users(id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_case_clients_org') then
    alter table public.test_case_clients
      add constraint fk_case_clients_org
      foreign key (organization_id) references public.test_organizations(id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_case_parties_case') then
    alter table public.test_case_parties
      add constraint fk_case_parties_case
      foreign key (case_id) references public.test_cases(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_case_handlers_case') then
    alter table public.test_case_handlers
      add constraint fk_case_handlers_case
      foreign key (case_id) references public.test_cases(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_case_handlers_user') then
    alter table public.test_case_handlers
      add constraint fk_case_handlers_user
      foreign key (user_id) references public.users(id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_case_lawsuits_case') then
    alter table public.test_case_lawsuits
      add constraint fk_case_lawsuits_case
      foreign key (case_id) references public.test_cases(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_lawsuit_parties_lawsuit') then
    alter table public.test_lawsuit_parties
      add constraint fk_lawsuit_parties_lawsuit
      foreign key (lawsuit_id) references public.test_case_lawsuits(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_lawsuit_parties_party') then
    alter table public.test_lawsuit_parties
      add constraint fk_lawsuit_parties_party
      foreign key (party_id) references public.test_case_parties(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_lawsuit_submissions_lawsuit') then
    alter table public.test_lawsuit_submissions
      add constraint fk_lawsuit_submissions_lawsuit
      foreign key (lawsuit_id) references public.test_case_lawsuits(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_individual_notifications_user') then
    alter table public.test_individual_notifications
      add constraint fk_individual_notifications_user
      foreign key (user_id) references public.users(id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_individual_notifications_case') then
    alter table public.test_individual_notifications
      add constraint fk_individual_notifications_case
      foreign key (case_id) references public.test_cases(id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_payment_plans_case') then
    alter table public.test_payment_plans
      add constraint fk_payment_plans_case
      foreign key (case_id) references public.test_cases(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_payment_plans_lawsuit') then
    alter table public.test_payment_plans
      add constraint fk_payment_plans_lawsuit
      foreign key (lawsuit_id) references public.test_case_lawsuits(id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_payment_plans_debtor') then
    alter table public.test_payment_plans
      add constraint fk_payment_plans_debtor
      foreign key (debtor_id) references public.test_case_parties(id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_recovery_activities_case') then
    alter table public.test_recovery_activities
      add constraint fk_recovery_activities_case
      foreign key (case_id) references public.test_cases(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_related_lawsuits_lawsuit') then
    alter table public.test_related_lawsuits
      add constraint fk_related_lawsuits_lawsuit
      foreign key (lawsuit_id) references public.test_case_lawsuits(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_schedules_case') then
    alter table public.test_schedules
      add constraint fk_schedules_case
      foreign key (case_id) references public.test_cases(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_schedules_lawsuit') then
    alter table public.test_schedules
      add constraint fk_schedules_lawsuit
      foreign key (lawsuit_id) references public.test_case_lawsuits(id) on delete set null;
  end if;
end $$;

-- indexes
create index if not exists idx_test_cases_created_at on public.test_cases(created_at desc);
create index if not exists idx_test_cases_status on public.test_cases(status);
create index if not exists idx_test_case_parties_case_id on public.test_case_parties(case_id);
create index if not exists idx_test_case_parties_name on public.test_case_parties(name);
create index if not exists idx_test_case_parties_company_name on public.test_case_parties(company_name);
create index if not exists idx_test_case_clients_case_id on public.test_case_clients(case_id);
create index if not exists idx_test_case_clients_individual_id on public.test_case_clients(individual_id);
create index if not exists idx_test_case_clients_organization_id on public.test_case_clients(organization_id);
create index if not exists idx_test_case_lawsuits_case_id on public.test_case_lawsuits(case_id);
create index if not exists idx_test_case_lawsuits_case_number on public.test_case_lawsuits(case_number);
create index if not exists idx_test_notifications_user_id on public.test_individual_notifications(user_id);
create index if not exists idx_test_schedules_case_id on public.test_schedules(case_id);
create index if not exists idx_test_recovery_case_id on public.test_recovery_activities(case_id);
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_case_opinions_case') then
    alter table public.test_case_opinions
      add constraint fk_case_opinions_case
      foreign key (case_id) references public.test_cases(id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_case_opinions_parent') then
    alter table public.test_case_opinions
      add constraint fk_case_opinions_parent
      foreign key (parent_id) references public.test_case_opinions(id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_case_opinions_created_by') then
    alter table public.test_case_opinions
      add constraint fk_case_opinions_created_by
      foreign key (created_by) references public.users(id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_case_opinions_receiver') then
    alter table public.test_case_opinions
      add constraint fk_case_opinions_receiver
      foreign key (receiver_id) references public.users(id) on delete set null;
  end if;
end $$;

create index if not exists idx_case_opinions_case_id on public.test_case_opinions(case_id);
create index if not exists idx_case_opinions_created_by on public.test_case_opinions(created_by);
create index if not exists idx_case_opinions_receiver_id on public.test_case_opinions(receiver_id);
create index if not exists idx_case_opinions_created_at on public.test_case_opinions(created_at desc);