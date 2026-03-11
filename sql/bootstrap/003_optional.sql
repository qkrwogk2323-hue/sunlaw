-- 개발 중에는 RLS를 끕니다.
alter table public.users disable row level security;
alter table public.test_organizations disable row level security;
alter table public.test_cases disable row level security;
alter table public.test_case_interests disable row level security;
alter table public.test_case_expenses disable row level security;
alter table public.test_case_clients disable row level security;
alter table public.test_case_parties disable row level security;
alter table public.test_case_handlers disable row level security;
alter table public.test_case_lawsuits disable row level security;
alter table public.test_lawsuit_parties disable row level security;
alter table public.test_lawsuit_submissions disable row level security;
alter table public.test_individual_notifications disable row level security;
alter table public.test_payment_plans disable row level security;
alter table public.test_recovery_activities disable row level security;
alter table public.test_related_lawsuits disable row level security;
alter table public.test_schedules disable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

alter default privileges in schema public
grant all on tables to anon, authenticated, service_role;

alter default privileges in schema public
grant all on sequences to anon, authenticated, service_role;

-- 개발용 seed users
insert into public.users (
  id, email, name, nickname, role, employee_type, created_at
)
values
  ('00000000-0000-4000-8000-000000000001', 'dev-admin@sunlaw.local', '개발용 운영자', '개발용 운영자', 'admin', 'internal', now()),
  ('00000000-0000-4000-8000-000000000002', 'dev-staff@sunlaw.local', '개발용 직원', '개발용 직원', 'staff', 'internal', now()),
  ('00000000-0000-4000-8000-000000000003', 'dev-client@sunlaw.local', '개발용 고객', '개발용 고객', 'client', null, now())
on conflict (id) do nothing;do $$
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
alter table public.test_case_opinions disable row level security;