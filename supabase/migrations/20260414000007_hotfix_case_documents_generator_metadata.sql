-- =============================================================================
-- Forward-only hotfix (2026-04-14)
--   지시서 DIRECTIVE_RESOLVE_CHAOS.md 4.7, 6.5:
--   문서 생성 영속화를 위한 case_documents 메타데이터 확장.
--
-- 배경:
--   개인회생/파산 문서 탭이 HTML Blob을 즉시 다운로드만 하고 사건 문서함에
--   기록이 남지 않는다. 재다운로드/재생성 근거/이력 추적 불가.
--
-- 변경:
--   case_documents에 세 컬럼 추가 (전부 nullable — 기존 행 무영향)
--     source_kind            — 'rehabilitation' | 'bankruptcy' | 등
--     source_document_type   — 생성기 내부 문서 타입 키 (예: 'creditor_list')
--     source_data_snapshot   — 재생성/감사 추적용 입력 데이터 JSON snapshot
--
-- 멱등: ADD COLUMN IF NOT EXISTS.
-- =============================================================================

ALTER TABLE public.case_documents
  ADD COLUMN IF NOT EXISTS source_kind text;

ALTER TABLE public.case_documents
  ADD COLUMN IF NOT EXISTS source_document_type text;

ALTER TABLE public.case_documents
  ADD COLUMN IF NOT EXISTS source_data_snapshot jsonb;

COMMENT ON COLUMN public.case_documents.source_kind IS
  '생성기 종류. rehabilitation, bankruptcy 등. null이면 수동 업로드 문서.';
COMMENT ON COLUMN public.case_documents.source_document_type IS
  '생성기 내부 문서 타입 키. creditor_list, application, repayment_plan 등.';
COMMENT ON COLUMN public.case_documents.source_data_snapshot IS
  '문서 생성 당시 입력 데이터 스냅샷. 재생성 및 감사 추적용.';

-- 조회 성능 — 사건별 생성 이력 빠르게 가져오기
CREATE INDEX IF NOT EXISTS idx_case_documents_generated
  ON public.case_documents (case_id, source_kind, source_document_type, created_at DESC)
  WHERE source_kind IS NOT NULL;
