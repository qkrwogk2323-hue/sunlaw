-- ═══════════════════════════════════════════════════
-- 개인회생 채권자: 별제권부 담보 + 기타 미확정
-- ═══════════════════════════════════════════════════
-- colaw 분석 결과, 미확정 채권은 단순 status flag가 아니라
-- (A) 별제권부 담보 부족액 또는 (B) 기타 미확정(신탁재산 등)
-- 두 경로로 도출됨. 한 채권자는 A 또는 B 중 하나만 가질 수 있음.

alter table public.rehabilitation_creditors
  add column if not exists secured_collateral_value numeric(18,0) not null default 0,
  add column if not exists is_other_unconfirmed boolean not null default false;

-- 기존 is_secured 컬럼은 0086에 이미 존재 → 재선언 안 함

-- 제약: 별제권부와 기타 미확정은 상호 배타
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'creditors_secured_xor_unconfirmed'
  ) then
    alter table public.rehabilitation_creditors
      add constraint creditors_secured_xor_unconfirmed
      check (not (is_secured and is_other_unconfirmed));
  end if;
end $$;

-- 별제권부는 담보평가액 > 0 이어야 의미가 있음
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'creditors_secured_requires_collateral'
  ) then
    alter table public.rehabilitation_creditors
      add constraint creditors_secured_requires_collateral
      check (not is_secured or secured_collateral_value > 0);
  end if;
end $$;

create index if not exists idx_rehab_creditors_secured
  on public.rehabilitation_creditors(case_id, is_secured)
  where is_secured = true;

create index if not exists idx_rehab_creditors_unconfirmed
  on public.rehabilitation_creditors(case_id, is_other_unconfirmed)
  where is_other_unconfirmed = true;
