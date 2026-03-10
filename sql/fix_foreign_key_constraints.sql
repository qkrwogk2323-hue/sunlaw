-- 두 개의 외래 키 제약 조건 모두 삭제
ALTER TABLE test_recovery_activities
DROP CONSTRAINT IF EXISTS test_recovery_activities_performed_by_fkey;

ALTER TABLE test_recovery_activities
DROP CONSTRAINT IF EXISTS fk_recovery_activities_created_by;

-- 하나의 새로운 외래 키 제약 조건 추가
ALTER TABLE test_recovery_activities 
ADD CONSTRAINT fk_recovery_activities_created_by
FOREIGN KEY (created_by) 
REFERENCES auth.users(id); 