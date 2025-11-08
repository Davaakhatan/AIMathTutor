-- Clean up duplicate XP records
-- Keep only the LATEST record for each (user_id, student_profile_id) combination

-- First, let's see what we have
-- SELECT user_id, student_profile_id, COUNT(*) as count
-- FROM xp_data
-- GROUP BY user_id, student_profile_id
-- HAVING COUNT(*) > 1;

-- Delete duplicates, keeping only the row with the highest updated_at
DELETE FROM xp_data
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, COALESCE(student_profile_id::text, 'null')
             ORDER BY updated_at DESC, created_at DESC
           ) as row_num
    FROM xp_data
  ) x
  WHERE x.row_num > 1
);

-- Do the same for streaks
DELETE FROM streaks
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, COALESCE(student_profile_id::text, 'null')
             ORDER BY updated_at DESC, created_at DESC
           ) as row_num
    FROM streaks
  ) x
  WHERE x.row_num > 1
);

-- Add unique constraints to prevent future duplicates
-- Drop existing if they exist, then add new ones
ALTER TABLE xp_data DROP CONSTRAINT IF EXISTS xp_data_user_profile_unique;
ALTER TABLE xp_data ADD CONSTRAINT xp_data_user_profile_unique UNIQUE (user_id, student_profile_id);

ALTER TABLE streaks DROP CONSTRAINT IF EXISTS streaks_user_profile_unique;
ALTER TABLE streaks ADD CONSTRAINT streaks_user_profile_unique UNIQUE (user_id, student_profile_id);

