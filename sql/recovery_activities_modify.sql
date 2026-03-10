-- 테이블 이름을 test_recovery_activities로 변경
ALTER TABLE recovery_activities RENAME TO test_recovery_activities;

-- activity_date 컬럼을 date로 변경
ALTER TABLE test_recovery_activities RENAME COLUMN activity_date TO date;

-- result 컬럼을 notes로 변경
ALTER TABLE test_recovery_activities RENAME COLUMN result TO notes;

-- amount_recovered 컬럼을 amount로 변경
ALTER TABLE test_recovery_activities RENAME COLUMN amount_recovered TO amount;

-- performed_by 컬럼을 created_by로 변경
ALTER TABLE test_recovery_activities RENAME COLUMN performed_by TO created_by;

-- 기존 외래 키 제약 조건이 있다면 삭제
ALTER TABLE test_recovery_activities
DROP CONSTRAINT IF EXISTS fk_recovery_activities_performed_by;

-- 새로운 외래 키 제약 조건 추가
ALTER TABLE test_recovery_activities 
ADD CONSTRAINT fk_recovery_activities_created_by
FOREIGN KEY (created_by) 
REFERENCES auth.users(id); 