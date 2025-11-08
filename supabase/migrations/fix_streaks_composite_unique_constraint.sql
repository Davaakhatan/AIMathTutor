-- Add composite unique constraint for streaks table
-- This fixes the churn bug (199 inserts, 195 deletes)
-- 
-- The code expects onConflict: "user_id,student_profile_id" but this constraint didn't exist.
-- The partial indexes (user_unique, profile_unique) are insufficient for upserts.

-- Step 1: First, ensure there are no duplicate records
-- Delete duplicates, keeping only the most recent one for each user_id/student_profile_id combo
DELETE FROM streaks a
USING streaks b
WHERE 
  a.id < b.id 
  AND a.user_id = b.user_id 
  AND (
    (a.student_profile_id IS NULL AND b.student_profile_id IS NULL)
    OR (a.student_profile_id = b.student_profile_id)
  );

-- Step 2: Add the composite unique constraint
-- This allows the upsert with onConflict: "user_id,student_profile_id" to work correctly
ALTER TABLE streaks 
ADD CONSTRAINT streaks_user_profile_unique 
UNIQUE (user_id, student_profile_id);

-- Step 3: Keep the partial indexes for additional query optimization
-- (They don't hurt and can speed up lookups)

-- Verify the constraint was added
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'streaks'::regclass
  AND conname = 'streaks_user_profile_unique';

