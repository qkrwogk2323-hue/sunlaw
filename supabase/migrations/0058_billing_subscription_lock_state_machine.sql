do $$ begin
  create type public.subscription_state as enum (
    'trialing',
    'active',
    'past_due',
    'locked_soft',
    'locked_hard',
    'cancelled'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.organization_subscription_states (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  state public.subscription_state not null default 'active',
  plan_code text,
  trial_start_at timestamptz,
  trial_end_at timestamptz,
  renewal_due_at timestamptz,
  past_due_started_at timestamptz,
  locked_soft_at timestamptz,
  locked_hard_at timestamptz,
  cancelled_at timestamptz,
  export_allowed_when_cancelled boolean not null default false,
  lock_reason text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_subscription_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  state public.subscription_state not null,
  event_type text not null,
  event_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_org_subscription_states_state
  on public.organization_subscription_states (state, updated_at desc);

create index if not exists idx_billing_subscription_events_org
  on public.billing_subscription_events (organization_id, created_at desc);

alter table public.organization_subscription_states enable row level security;
alter table public.organization_subscription_states force row level security;
alter table public.billing_subscription_events enable row level security;
alter table public.billing_subscription_events force row level security;

drop policy if exists org_subscription_state_select on public.organization_subscription_states;
create policy org_subscription_state_select
on public.organization_subscription_states
for select
to authenticated
using (
  app.is_platform_admin()
  or app.is_org_member(organization_id)
);

drop policy if exists org_subscription_state_manage on public.organization_subscription_states;
create policy org_subscription_state_manage
on public.organization_subscription_states
for all
to authenticated
using (
  app.is_platform_admin()
)
with check (
  app.is_platform_admin()
);

drop policy if exists billing_subscription_events_select on public.billing_subscription_events;
create policy billing_subscription_events_select
on public.billing_subscription_events
for select
to authenticated
using (
  app.is_platform_admin()
  or app.is_org_member(organization_id)
);

drop policy if exists billing_subscription_events_manage on public.billing_subscription_events;
create policy billing_subscription_events_manage
on public.billing_subscription_events
for all
to authenticated
using (
  app.is_platform_admin()
)
with check (
  app.is_platform_admin()
);

create or replace function app.log_subscription_state_change()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.billing_subscription_events (
      organization_id,
      state,
      event_type,
      event_reason,
      created_by
    ) values (
      new.organization_id,
      new.state,
      'state_initialized',
      new.lock_reason,
      new.updated_by
    );
    return new;
  end if;

  if old.state is distinct from new.state
    or old.lock_reason is distinct from new.lock_reason
    or old.plan_code is distinct from new.plan_code then
    insert into public.billing_subscription_events (
      organization_id,
      state,
      event_type,
      event_reason,
      metadata,
      created_by
    ) values (
      new.organization_id,
      new.state,
      'state_changed',
      new.lock_reason,
      jsonb_build_object(
        'previous_state', old.state,
        'plan_code', new.plan_code
      ),
      new.updated_by
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_org_subscription_states_updated_at on public.organization_subscription_states;
create trigger trg_org_subscription_states_updated_at
before update on public.organization_subscription_states
for each row execute procedure app.set_updated_at();

drop trigger if exists trg_org_subscription_state_events on public.organization_subscription_states;
create trigger trg_org_subscription_state_events
after insert or update on public.organization_subscription_states
for each row execute procedure app.log_subscription_state_change();

insert into public.organization_subscription_states (
  organization_id,
  state
)
select
  o.id,
  'active'::public.subscription_state
from public.organizations o
where o.lifecycle_status = 'active'
on conflict (organization_id) do nothing;
