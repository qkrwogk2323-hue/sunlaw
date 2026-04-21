-- ═══════════════════════════════════════════════════════════════════════════════
-- Hotfix: 6개 테이블에 deleted_at 컬럼 추가
--
-- 문제: CLAUDE.md Soft Delete 규칙(UX #8)에 따라 앱 코드 30+곳이
--       .is('deleted_at', null)로 필터링하지만, DDL에 해당 컬럼이 선언 안 됨.
--       사용자가 billing_entries, case_documents, fee_agreements 등에서
--       삭제를 시도하면 "column not found" 에러 발생.
--
-- 발견: 2026-04-19 전수 조사 (FULL_SITE_AUDIT_REPORT.md)
--        + 3-역할 projection 검증 과정에서 staging DB 컬럼 부재 확인.
--
-- 영향: 기존 데이터 변경 없음 (NULL 기본값).
--       IF NOT EXISTS로 멱등성 보장 (이미 컬럼이 있으면 skip).
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.billing_entries
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.case_documents
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.case_messages
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.case_requests
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.case_schedules
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.fee_agreements
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
