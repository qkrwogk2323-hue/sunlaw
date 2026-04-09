-- ============================================================
-- 0094 repay_months/repay_period_option nullable + empty 6건 NULL 처리 (PR-4)
-- ============================================================
-- 검사관 2026-04-09 보고서 (audit/inspector_report_2026-04-09_empty6.md):
--   파서 버그 수정 후 재스캔 결과 empty 6건은 COLAW 진짜 미입력 확정.
--   변제개월 진실값이 존재하지 않음 → "변제기간 미설정" 상태로 NULL 보존이 정답.
--
-- 옵션 A 진행:
--   1. repay_months / repay_period_option 컬럼을 nullable 전환
--   2. empty 6건 (case_id 직접 매칭) → NULL set
--   3. 하류 UI는 fallback 처리 기존 존재 (rehab-plan-tab.tsx:51 || 60)
--      → 별도 PR에서 "미설정" 배지 UX 추가 (PR-5)
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- STEP 1. 컬럼 nullable 전환
-- ------------------------------------------------------------
alter table public.rehabilitation_income_settings
  alter column repay_months drop not null;

alter table public.rehabilitation_income_settings
  alter column repay_period_option drop not null;

-- ------------------------------------------------------------
-- STEP 2. empty 6건 NULL 처리 (case_id 직접 매칭)
--   매핑 출처: 운영자가 supabase-js로 직접 조회 (2026-04-09)
--   n=12 이옥주, n=26 조두성, n=43 서동재, n=62 문연자, n=66 임경애, n=68 박복희
-- ------------------------------------------------------------
update public.rehabilitation_income_settings
set repay_months = null,
    repay_period_option = null,
    updated_at = now()
where case_id in (
  '0ffba75c-6790-4854-b19b-46cfeb60c254',  -- n=12 이옥주
  'ab90ed22-4133-4731-929e-1d9bba52c3b6',  -- n=26 조두성
  '94980237-747b-4a90-badd-82e04b773190',  -- n=43 서동재
  '342fc813-cc88-4e93-b6aa-f8540b045b83',  -- n=62 문연자
  'aa3c1d5b-3944-4b20-a4b7-0eed063dae90',  -- n=66 임경애
  'b7e5b15d-0356-4f13-8823-822406451ad5'   -- n=68 박복희
);

-- ------------------------------------------------------------
-- STEP 3. 사후 검증
-- ------------------------------------------------------------
do $$
declare
  v_nulled int;
  v_over int;
begin
  -- 3-1. 정확히 6건 NULL 처리됐는지
  select count(*) into v_nulled
  from public.rehabilitation_income_settings
  where case_id in (
    '0ffba75c-6790-4854-b19b-46cfeb60c254',
    'ab90ed22-4133-4731-929e-1d9bba52c3b6',
    '94980237-747b-4a90-badd-82e04b773190',
    '342fc813-cc88-4e93-b6aa-f8540b045b83',
    'aa3c1d5b-3944-4b20-a4b7-0eed063dae90',
    'b7e5b15d-0356-4f13-8823-822406451ad5'
  )
    and repay_months is null
    and repay_period_option is null;

  if v_nulled <> 6 then
    raise exception 'PR-4 검증 실패: NULL 처리된 row % (예상 6).', v_nulled;
  end if;

  -- 3-2. 전체 범위 위반 0건 (이제 garbage 72 잔존 0건이어야 함)
  select count(*) into v_over
  from public.rehabilitation_income_settings
  where repay_months > 60;

  if v_over > 0 then
    raise exception 'PR-4 검증 실패: empty 6건 NULL 후에도 repay_months > 60 row % 건 잔존.', v_over;
  end if;

  raise notice 'PR-4 적용 완료: 6 row NULL 처리, repay_months > 60 잔존 0건.';
end $$;

COMMIT;
