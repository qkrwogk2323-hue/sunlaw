-- 중복된 외래 키 제약 조건 test_recovery_activities_performed_by_fkey 삭제
ALTER TABLE test_recovery_activities
DROP CONSTRAINT IF EXISTS test_recovery_activities_performed_by_fkey; 