-- =============================================================================
-- Forward-only hotfix (2026-04-24)
--   rehabilitation_creditors.bond_type 제약조건 보정.
--
--   008_rehabilitation.sql DDL에 NOT NULL + CHECK가 정의되어 있으나,
--   일부 환경에서 컬럼이 nullable / CHECK 없이 추가된 경우가 발생.
--   이 hotfix는 해당 drift를 보정한다.
--
-- 영향: bond_type에 NULL이나 허용외 값이 없는 경우에만 성공.
--       이미 제약조건이 있으면 DO NOTHING.
-- =============================================================================

-- NOT NULL 보정 (이미 NOT NULL이면 무시됨)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rehabilitation_creditors'
      AND column_name = 'bond_type'
      AND is_nullable = 'YES'
  ) THEN
    -- NULL 값이 있으면 기본값으로 채움
    UPDATE public.rehabilitation_creditors
      SET bond_type = '주채무' WHERE bond_type IS NULL;
    ALTER TABLE public.rehabilitation_creditors
      ALTER COLUMN bond_type SET NOT NULL;
  END IF;
END $$;

-- CHECK 제약조건 보정 (이미 있으면 무시)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.rehabilitation_creditors'::regclass
      AND conname = 'rehabilitation_creditors_bond_type_check'
  ) THEN
    ALTER TABLE public.rehabilitation_creditors
      ADD CONSTRAINT rehabilitation_creditors_bond_type_check
      CHECK (bond_type IN ('주채무','보증채무','연대보증'));
  END IF;
END $$;
