-- 0063: insolvency case_type enum + insolvency_subtype enum 추가
-- 주의: ALTER TYPE ADD VALUE는 같은 트랜잭션 내에서 즉시 사용 불가.
-- 컬럼 추가 및 insolvency 사용은 다음 migration(0064)에서 처리.

-- 1. case_type enum에 insolvency 추가
alter type public.case_type add value if not exists 'insolvency';

-- 2. insolvency_subtype enum 생성
do $$ begin
  create type public.insolvency_subtype as enum (
    'individual_rehabilitation',
    'individual_bankruptcy',
    'corporate_rehabilitation',
    'corporate_bankruptcy'
  );
exception when duplicate_object then null; end $$;
