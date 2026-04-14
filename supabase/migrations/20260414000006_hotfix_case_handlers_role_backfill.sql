-- =============================================================================
-- Forward-only hotfix (2026-04-14)
--   지시서 DIRECTIVE_RESOLVE_CHAOS.md 4.5, 6.4:
--   handler role 값을 'case_manager' 하나로 고정. 레거시 '담당' 값을 백필.
--
-- 배경:
--   create_case_atomic RPC와 bulk-upload-actions는 이미 'case_manager'를 쓰고
--   있으나, 과거 createCaseCoreWrite가 직접 insert하던 시절 '담당'으로 저장된
--   레거시 데이터가 원격 DB에 14건 남아 있다 (확인 완료).
--
-- 변경:
--   1. 레거시 '담당' → 'case_manager' 일괄 백필
--   2. 추가 타이트닝은 별도 단계에서 (role 값 taxonomy 합의 후 CHECK 제약)
--
-- 멱등: UPDATE ... WHERE role='담당' 이므로 재실행 시 WHERE 조건이 0건이라
-- 무해.
-- =============================================================================

UPDATE public.case_handlers
SET role = 'case_manager',
    updated_at = timezone('utc'::text, now())
WHERE role = '담당';
