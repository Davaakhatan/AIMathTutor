-- Simple cleanup script - run this in Supabase SQL Editor
-- Removes duplicate XP and streak records, keeps only the LATEST one

-- Step 1: Delete duplicate XP records (keep newest by updated_at)
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

-- Step 2: Delete duplicate streak records (keep newest by updated_at)
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

-- Step 3: Check results
SELECT 'XP Records After Cleanup' as info, COUNT(*) as total_records FROM xp_data;
SELECT 'Streak Records After Cleanup' as info, COUNT(*) as total_records FROM streaks;

-- Step 4: Show remaining records for this user
SELECT 'User XP Data' as info, * FROM xp_data 
WHERE user_id = '1ca456bd-f506-48d9-9834-4a3227e0038f'
ORDER BY updated_at DESC;

