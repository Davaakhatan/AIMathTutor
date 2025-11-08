-- Fix unique constraint for xp_data and streaks
-- The constraint exists but isn't working - need to drop and recreate properly

-- Step 1: Clean up ALL duplicate records first
DELETE FROM xp_data
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, COALESCE(student_profile_id::text, 'null')
        ORDER BY updated_at DESC, created_at DESC
      ) as row_num
    FROM xp_data
  ) x
  WHERE x.row_num > 1
);

DELETE FROM streaks
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, COALESCE(student_profile_id::text, 'null')
        ORDER BY updated_at DESC, created_at DESC
      ) as row_num
    FROM streaks
  ) x
  WHERE x.row_num > 1
);

-- Step 2: Drop existing constraints (this will also drop the associated indexes)
ALTER TABLE xp_data DROP CONSTRAINT IF EXISTS xp_data_user_profile_unique;
ALTER TABLE streaks DROP CONSTRAINT IF EXISTS streaks_user_profile_unique;

-- Step 3: Recreate UNIQUE constraints with proper names
ALTER TABLE xp_data 
  ADD CONSTRAINT xp_data_user_profile_unique 
  UNIQUE (user_id, student_profile_id);

ALTER TABLE streaks 
  ADD CONSTRAINT streaks_user_profile_unique 
  UNIQUE (user_id, student_profile_id);

-- Step 4: Verify constraints exist
SELECT 
  'xp_data constraints' as table_name,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'xp_data'::regclass
  AND contype = 'u';

SELECT 
  'streaks constraints' as table_name,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'streaks'::regclass
  AND contype = 'u';

