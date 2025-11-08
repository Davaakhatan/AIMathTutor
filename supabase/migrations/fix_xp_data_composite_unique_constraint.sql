-- Add composite unique constraint for xp_data table
-- Similar to streaks, the code expects onConflict: "user_id,student_profile_id"
-- but this constraint doesn't exist in the schema.

-- Step 1: Ensure there are no duplicate records
-- Delete duplicates, keeping only the most recent one for each user_id/student_profile_id combo
DELETE FROM xp_data a
USING xp_data b
WHERE 
  a.id < b.id 
  AND a.user_id = b.user_id 
  AND (
    (a.student_profile_id IS NULL AND b.student_profile_id IS NULL)
    OR (a.student_profile_id = b.student_profile_id)
  );

-- Step 2: Add the composite unique constraint
ALTER TABLE xp_data 
ADD CONSTRAINT xp_data_user_profile_unique 
UNIQUE (user_id, student_profile_id);

-- Verify the constraint was added
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'xp_data'::regclass
  AND conname = 'xp_data_user_profile_unique';

