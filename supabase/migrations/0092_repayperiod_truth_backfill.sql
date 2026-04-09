-- ============================================================
-- 0092 repayperiod truth backfill (PR-2)
-- ============================================================
-- 출처: audit/colaw_repayperiod_truth.tsv (COLAW 90건 풀스캔 2026-04-08)
-- 근거: audit/inspector_report_2026-04-08.md
-- 매핑: cases.summary LIKE 'colaw #N %' ← truth.tsv n 컬럼 (결정론적, 동명이인 안전)
-- 정책:
--   - 84건: truth 값으로 UPDATE
--   - 6건 (empty: 박복희, 임경애n66, 문연자, 서동재, 조두성n26, 이옥주n12)
--     → repay_months 컬럼이 NOT NULL이라 NULL 불가. UPDATE 제외 (현재 상태 유지).
--     → 별도 트랙에서 사용자 결정 후 처리 (PR-3 또는 후속)
-- 안전장치:
--   - BEGIN/COMMIT 트랜잭션
--   - _backup_0092_rehab_income_settings 백업 테이블 생성
--   - DO 블록 사후 검증 (repay_months > 60 = 0건 확인, 위반 시 RAISE)
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- STEP 0. 백업 스냅샷
-- ------------------------------------------------------------
create table if not exists public._backup_0092_rehab_income_settings (
  case_id uuid primary key,
  repay_months int,
  repay_period_option text,
  updated_at timestamptz,
  _backup_at timestamptz not null default now()
);

insert into public._backup_0092_rehab_income_settings (case_id, repay_months, repay_period_option, updated_at)
select ris.case_id, ris.repay_months, ris.repay_period_option, ris.updated_at
from public.rehabilitation_income_settings ris
join public.cases c on c.id = ris.case_id
where c.summary ~ '^colaw #[0-9]+($|\s)'
on conflict (case_id) do nothing;

-- ------------------------------------------------------------
-- STEP 1. truth 84건 결정론 UPDATE
--   매핑: cases.summary 'colaw #N {name} 마이그레이션' → truth n
-- ------------------------------------------------------------
with truth(n, repay_months, repay_period_option) as (
  values
    -- capital36 (rps=6 frm=36, 법정 기본): 61건
    (90, 36, 'capital36'), (89, 36, 'capital36'), (88, 36, 'capital36'),
    (87, 36, 'capital36'), (86, 36, 'capital36'), (85, 36, 'capital36'),
    (84, 36, 'capital36'), (83, 36, 'capital36'), (82, 36, 'capital36'),
    (80, 36, 'capital36'), (79, 36, 'capital36'), (78, 36, 'capital36'),
    (77, 36, 'capital36'), (76, 36, 'capital36'), (75, 36, 'capital36'),
    (74, 36, 'capital36'), (73, 36, 'capital36'), (72, 36, 'capital36'),
    (71, 36, 'capital36'), (70, 36, 'capital36'), (67, 36, 'capital36'),
    (63, 36, 'capital36'), (61, 36, 'capital36'), (60, 36, 'capital36'),
    (59, 36, 'capital36'), (57, 36, 'capital36'), (56, 36, 'capital36'),
    (54, 36, 'capital36'), (53, 36, 'capital36'), (51, 36, 'capital36'),
    (50, 36, 'capital36'), (49, 36, 'capital36'), (48, 36, 'capital36'),
    (46, 36, 'capital36'), (45, 36, 'capital36'), (42, 36, 'capital36'),
    (41, 36, 'capital36'), (40, 36, 'capital36'), (39, 36, 'capital36'),
    (38, 36, 'capital36'), (37, 36, 'capital36'), (36, 36, 'capital36'),
    (35, 36, 'capital36'), (34, 36, 'capital36'), (32, 36, 'capital36'),
    (30, 36, 'capital36'), (29, 36, 'capital36'), (28, 36, 'capital36'),
    (27, 36, 'capital36'), (25, 36, 'capital36'), (23, 36, 'capital36'),
    (21, 36, 'capital36'), (17, 36, 'capital36'), (16, 36, 'capital36'),
    (13, 36, 'capital36'), (10, 36, 'capital36'), (9, 36, 'capital36'),
    (7, 36, 'capital36'), (6, 36, 'capital36'), (5, 36, 'capital36'),
    (1, 36, 'capital36'),

    -- capital60 (rps=1 또는 rps=6 frm=60): 21건
    (81, 60, 'capital60'), (69, 60, 'capital60'), (65, 60, 'capital60'),
    (64, 60, 'capital60'), (58, 60, 'capital60'), (55, 60, 'capital60'),
    (52, 60, 'capital60'), (47, 60, 'capital60'), (44, 60, 'capital60'),
    (33, 60, 'capital60'), (31, 60, 'capital60'), (24, 60, 'capital60'),
    (22, 60, 'capital60'), (20, 60, 'capital60'), (19, 60, 'capital60'),
    (18, 60, 'capital60'), (11, 60, 'capital60'), (8, 60, 'capital60'),
    (4, 60, 'capital60'), (3, 60, 'capital60'), (2, 60, 'capital60'),

    -- custom months (rps=6 frm=45/48 → capital100_5y 흡수): 2건
    (15, 48, 'capital100_5y'),  -- 이진호
    (14, 45, 'capital100_5y')   -- 이옥주(n=14)
)
update public.rehabilitation_income_settings ris
set repay_months = t.repay_months,
    repay_period_option = t.repay_period_option,
    updated_at = now()
from truth t
join public.cases c on c.summary ~ ('^colaw #' || t.n || '($|\s)')
where ris.case_id = c.id;

-- n=84 (김진한): cases.summary가 '의뢰인: 김진한'으로 colaw 패턴 없음.
-- case_id 직접 매칭 (수동 확인: 2026-04-09 운영자 직접 조회).
update public.rehabilitation_income_settings
set repay_months = 36,
    repay_period_option = 'capital36',
    updated_at = now()
where case_id = 'cbf04b73-a193-4e02-b5ac-1c9cca381620';

-- ------------------------------------------------------------
-- STEP 2. 사후 검증 (실패 시 RAISE → 자동 ROLLBACK)
-- ------------------------------------------------------------
do $$
declare
  v_over int;
  v_updated_84 int;
  v_backup_total int;
begin
  -- 2-1. 범위 위반 0건 (empty 6건 제외)
  -- empty n: 68(박복희), 66(임경애), 62(문연자), 43(서동재), 26(조두성), 12(이옥주)
  select count(*) into v_over
  from public.rehabilitation_income_settings ris
  join public.cases c on c.id = ris.case_id
  where c.summary ~ '^colaw #[0-9]+($|\s)'
    and ris.repay_months > 60
    and (c.summary !~ '^colaw #(68|66|62|43|26|12)($|\s)');

  if v_over > 0 then
    raise exception 'PR-2 검증 실패: empty 6건 외에 repay_months > 60 인 row가 % 건 존재. ROLLBACK.', v_over;
  end if;

  -- 2-2. UPDATE 영향 row 정확성 검증 (M2 보강)
  --   동일 트랜잭션 내 updated_at = transaction_timestamp() 비교
  --   83건은 colaw #N 매칭, 1건은 김진한 case_id 직접 (n=84 summary 비표준)
  select count(*) into v_updated_84
  from public.rehabilitation_income_settings ris
  left join public.cases c on c.id = ris.case_id
  where ris.updated_at = transaction_timestamp()
    and (
      (c.summary ~ '^colaw #[0-9]+($|\s)'
        and c.summary !~ '^colaw #(68|66|62|43|26|12)($|\s)')
      or ris.case_id = 'cbf04b73-a193-4e02-b5ac-1c9cca381620'
    );

  if v_updated_84 <> 84 then
    raise exception 'PR-2 실패: UPDATE 영향 row % (예상 84). truth 매핑 또는 cases.summary 패턴 불일치.', v_updated_84;
  end if;

  -- 2-3. 백업 row 수 NOTICE
  select count(*) into v_backup_total
  from public._backup_0092_rehab_income_settings;
  raise notice 'PR-2 백업 row 수: % (예상 ≈ 90), UPDATE 영향: 84', v_backup_total;
end $$;

-- ------------------------------------------------------------
-- STEP 3. 진단 출력 — empty 6건 현재 상태 (별도 트랙용)
-- ------------------------------------------------------------
do $$
declare
  r record;
begin
  raise notice '--- empty 6건 현재 repay_months 상태 (UPDATE 제외) ---';
  for r in
    select c.summary, ris.repay_months, ris.repay_period_option
    from public.rehabilitation_income_settings ris
    join public.cases c on c.id = ris.case_id
    where c.summary ~ '^colaw #(68|66|62|43|26|12)($|\s)'
    order by c.summary
  loop
    raise notice '  %  →  months=%  option=%', r.summary, r.repay_months, r.repay_period_option;
  end loop;
end $$;

COMMIT;

-- ============================================================
-- ROLLBACK SQL (수동 실행용 — 별도 파일 audit/0092_rollback.sql 권장)
-- ============================================================
-- BEGIN;
-- update public.rehabilitation_income_settings ris
-- set repay_months = b.repay_months,
--     repay_period_option = b.repay_period_option,
--     updated_at = b.updated_at
-- from public._backup_0092_rehab_income_settings b
-- where ris.case_id = b.case_id;
-- COMMIT;
