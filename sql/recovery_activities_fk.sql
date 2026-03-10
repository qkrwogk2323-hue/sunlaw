-- Foreign key for test_recovery_activities.performed_by
ALTER TABLE test_recovery_activities 
ADD CONSTRAINT fk_recovery_activities_performed_by
FOREIGN KEY (performed_by) 
REFERENCES auth.users(id); 