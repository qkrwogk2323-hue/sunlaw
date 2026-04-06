-- ═══════════════════════════════════════════════════
-- 개인회생 채권자 확정/미확정 구분
-- ═══════════════════════════════════════════════════
-- colaw는 월변제표에 확정채권과 미확정채권(유보)을 병렬로 표기
-- 기본값 'confirmed' — 기존 데이터는 전원 확정으로 간주 (회귀 없음)

alter table public.rehabilitation_creditors
  add column if not exists confirmation_status text not null default 'confirmed'
  check (confirmation_status in ('confirmed', 'unconfirmed'));

create index if not exists idx_rehab_creditors_confirmation
  on public.rehabilitation_creditors(case_id, confirmation_status);
