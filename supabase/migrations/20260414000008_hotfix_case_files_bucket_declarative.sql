-- =============================================================================
-- Forward-only hotfix (2026-04-14)
--   지시서 DIRECTIVE_RESOLVE_CHAOS.md 4.7 집행 (종료 지시 4.3):
--   Storage의 case-files 버킷을 선언형으로 고정. 환경별 drift 차단.
--
-- 배경
--   문서 생성 영속화(20260414000007)는 case-files 버킷을 전제로 하지만, 버킷
--   생성과 정책이 migration이 아닌 대시보드 조작으로 만들어져 있어 fresh DB
--   setup 시 재현되지 않는다. 또한 persistence.ts가 사용하던 경로 규약
--   ({orgId}/{caseId}/...) 이 기존 storage 정책
--   (첫 폴더 'org' 리터럴 + 두 번째 UUID)과 달라 RLS가 불일치했다.
--
-- 변경
--   1. storage.buckets에 case-files 선언 (ON CONFLICT DO NOTHING — 멱등)
--   2. 경로 규약 표준화: org/{orgId}/{caseId}/generated/{kind}/{type}/{file}.html
--   3. 기존 staff_can_*(upload/update/delete) 정책 유지하되 공통화
--   4. 인가 사용자의 SELECT 정책 신설 — case_id 경로 세그먼트에 대해
--      app.can_access_case 검증 (마지막 방어선과 동치)
--
-- 멱등: INSERT ON CONFLICT / CREATE POLICY IF NOT EXISTS / DROP IF EXISTS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. case-files 버킷 선언
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'case-files',
  'case-files',
  false,
  52428800, -- 50MB
  NULL      -- 모든 MIME 허용 (법원 제출용 HWP, PDF, HTML 혼용)
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE storage.buckets IS
  'Supabase Storage 버킷 선언. case-files 버킷 경로 규약: org/{orgId}/{caseId}/... 또는 org/{orgId}/{caseId}/generated/{kind}/{type}/...';

-- -----------------------------------------------------------------------------
-- 2. 인가 사용자 SELECT 정책 — app.can_access_case 기반
--    경로 세그먼트 (1-indexed):
--      [1] = 'org' (리터럴)
--      [2] = organization_id (UUID)
--      [3] = case_id (UUID, 선택적)
--      [4] = 'generated' (선택적, 생성 문서 디렉터리)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS case_files_authenticated_select ON storage.objects;
CREATE POLICY case_files_authenticated_select ON storage.objects
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    bucket_id = 'case-files'
    AND (storage.foldername(name))[1] = 'org'
    AND (
      -- 조직 스태프는 조직 경로 아래 전체 접근
      app.is_org_staff(((storage.foldername(name))[2])::uuid)
      -- 또는 사건 접근 권한이 있는 사용자는 case_id 경로 아래 접근 (의뢰인 포함)
      OR (
        array_length(storage.foldername(name), 1) >= 3
        AND app.can_access_case(((storage.foldername(name))[3])::uuid)
      )
    )
  );

-- -----------------------------------------------------------------------------
-- 3. 기존 staff_can_* 정책은 이미 존재 — 무변경 (멱등성 위해 재선언 안 함)
--    upload / update / delete: org_staff 기준 그대로 유지.
--    SELECT는 새로 추가된 case_files_authenticated_select로 더 넓게 허용.
-- -----------------------------------------------------------------------------
