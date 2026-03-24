-- Migration 0084: temp_credentials에 status 컬럼 추가
-- active / revoked / expired 세 상태로 임시계정 생애주기 추적

-- ── staff 임시계정 ──────────────────────────────────────────────
alter table public.organization_staff_temp_credentials
  add column if not exists credential_status text not null default 'active'
    check (credential_status in ('active', 'revoked', 'expired')),
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references public.profiles(id) on delete set null;

-- 기존 row 중 revoke된 것은 없으므로 모두 active 유지
-- (revokeStaffTempCredentialAction은 row를 delete했으므로 남아 있는 것은 active)
create index if not exists idx_staff_temp_cred_status
  on public.organization_staff_temp_credentials (organization_id, credential_status);

-- ── client 임시계정 ──────────────────────────────────────────────
alter table public.client_temp_credentials
  add column if not exists credential_status text not null default 'active'
    check (credential_status in ('active', 'revoked', 'expired')),
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references public.profiles(id) on delete set null;

create index if not exists idx_client_temp_cred_status
  on public.client_temp_credentials (organization_id, credential_status);

-- ── revokeStaffTempCredentialAction 이후 status 업데이트를 위한 함수 ──
-- 이제 delete 대신 update credential_status='revoked' + revoked_at + revoked_by 를 사용한다.
-- (기존 action 코드는 별도 Server Action에서 update로 변경됨)

-- ── case_messages.case_id nullable 변경 ───────────────────────────
-- 조직소통대화방은 사건이 없어도 메시지를 보낼 수 있어야 한다.
-- case_id가 없는 경우 조직 내부 메시지로 저장됨.
alter table public.case_messages
  drop constraint if exists case_messages_case_id_fkey;
alter table public.case_messages
  alter column case_id drop not null;
alter table public.case_messages
  add constraint case_messages_case_id_fkey
    foreign key (case_id) references public.cases(id) on delete cascade;
