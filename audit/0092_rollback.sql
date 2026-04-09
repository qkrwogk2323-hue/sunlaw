-- ============================================================
-- 0092 ROLLBACK SQL (수동 실행)
-- ============================================================
-- 0092 적용 후 문제 발견 시 본 파일을 Studio SQL Editor에서 직접 실행.
-- _backup_0092_rehab_income_settings 테이블이 존재해야 동작.
-- ============================================================

BEGIN;

update public.rehabilitation_income_settings ris
set repay_months = b.repay_months,
    repay_period_option = b.repay_period_option,
    updated_at = b.updated_at
from public._backup_0092_rehab_income_settings b
where ris.case_id = b.case_id;

-- 사후 검증
do $$
declare
  v_count int;
begin
  select count(*) into v_count from public._backup_0092_rehab_income_settings;
  raise notice 'ROLLBACK 적용: % rows 복원됨', v_count;
end $$;

COMMIT;
