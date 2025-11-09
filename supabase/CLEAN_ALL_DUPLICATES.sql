-- CLEAN ALL DUPLICATE XP AND STREAK RECORDS
-- Run this BEFORE testing the profileId fix

-- ============================================
-- CLEAN XP DATA DUPLICATES
-- ============================================

-- Step 1: Log duplicate XP records (for debugging)
DO $$
DECLARE
  duplicate_count INT;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT user_id, student_profile_id
    FROM xp_data
    GROUP BY user_id, student_profile_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  RAISE NOTICE 'Found % duplicate XP record groups', duplicate_count;
END $$;

-- Step 2: Keep only the most recent XP record for each (user_id, student_profile_id) pair
DELETE FROM xp_data
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, student_profile_id)
    id
  FROM xp_data
  ORDER BY user_id, student_profile_id, updated_at DESC
);

-- ============================================
-- CLEAN STREAK DUPLICATES
-- ============================================

-- Step 1: Log duplicate streak records
DO $$
DECLARE
  duplicate_count INT;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT user_id, student_profile_id
    FROM streaks
    GROUP BY user_id, student_profile_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  RAISE NOTICE 'Found % duplicate streak record groups', duplicate_count;
END $$;

-- Step 2: Keep only the most recent streak record for each (user_id, student_profile_id) pair
DELETE FROM streaks
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, student_profile_id)
    id
  FROM streaks
  ORDER BY user_id, student_profile_id, updated_at DESC
);

-- ============================================
-- VERIFY CLEANUP
-- ============================================

-- Show XP data after cleanup
DO $$
DECLARE
  total_xp_records INT;
  duplicate_xp_groups INT;
BEGIN
  SELECT COUNT(*) INTO total_xp_records FROM xp_data;
  
  SELECT COUNT(*) INTO duplicate_xp_groups
  FROM (
    SELECT user_id, student_profile_id
    FROM xp_data
    GROUP BY user_id, student_profile_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  RAISE NOTICE 'XP Data: % total records, % duplicate groups remaining', 
    total_xp_records, duplicate_xp_groups;
END $$;

-- Show streak data after cleanup
DO $$
DECLARE
  total_streak_records INT;
  duplicate_streak_groups INT;
BEGIN
  SELECT COUNT(*) INTO total_streak_records FROM streaks;
  
  SELECT COUNT(*) INTO duplicate_streak_groups
  FROM (
    SELECT user_id, student_profile_id
    FROM streaks
    GROUP BY user_id, student_profile_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  RAISE NOTICE 'Streaks: % total records, % duplicate groups remaining', 
    total_streak_records, duplicate_streak_groups;
END $$;

-- ============================================
-- OPTIONAL: Show current data distribution
-- ============================================

SELECT 
  'XP Data' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(CASE WHEN student_profile_id IS NULL THEN 1 ELSE 0 END) as user_level_records,
  SUM(CASE WHEN student_profile_id IS NOT NULL THEN 1 ELSE 0 END) as profile_level_records
FROM xp_data

UNION ALL

SELECT 
  'Streaks' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(CASE WHEN student_profile_id IS NULL THEN 1 ELSE 0 END) as user_level_records,
  SUM(CASE WHEN student_profile_id IS NOT NULL THEN 1 ELSE 0 END) as profile_level_records
FROM streaks;

