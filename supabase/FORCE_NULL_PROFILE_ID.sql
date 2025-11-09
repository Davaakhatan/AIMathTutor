-- FORCE ALL STUDENT RECORDS TO USE NULL PROFILE_ID
-- This converts any existing profile-level records to user-level for students

-- ============================================
-- FIX XP DATA
-- ============================================

-- Step 1: Show what we're about to fix
SELECT 
  'Before Fix' as status,
  id,
  user_id,
  student_profile_id,
  total_xp,
  level
FROM xp_data
WHERE student_profile_id IS NOT NULL;

-- Step 2: Update all XP records to use null student_profile_id
-- For students, we consolidate to user-level (student_profile_id = null)
UPDATE xp_data
SET student_profile_id = NULL
WHERE student_profile_id IS NOT NULL;

-- Step 3: Now clean any duplicates that might have been created
-- Keep the one with highest total_xp
DELETE FROM xp_data
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, student_profile_id)
    id
  FROM xp_data
  ORDER BY user_id, student_profile_id, total_xp DESC, updated_at DESC
);

-- ============================================
-- FIX STREAKS
-- ============================================

-- Step 1: Show what we're about to fix
SELECT 
  'Before Fix' as status,
  id,
  user_id,
  student_profile_id,
  current_streak,
  longest_streak
FROM streaks
WHERE student_profile_id IS NOT NULL;

-- Step 2: Update all streak records to use null student_profile_id
UPDATE streaks
SET student_profile_id = NULL
WHERE student_profile_id IS NOT NULL;

-- Step 3: Clean any duplicates
-- Keep the one with highest current_streak
DELETE FROM streaks
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, student_profile_id)
    id
  FROM streaks
  ORDER BY user_id, student_profile_id, current_streak DESC, updated_at DESC
);

-- ============================================
-- VERIFY FIX
-- ============================================

-- Should show 0 profile_level_records for both tables
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

-- Show final state
SELECT 
  'After Fix - XP Data' as status,
  id,
  user_id,
  student_profile_id,
  total_xp,
  level,
  updated_at
FROM xp_data
ORDER BY updated_at DESC;

SELECT 
  'After Fix - Streaks' as status,
  id,
  user_id,
  student_profile_id,
  current_streak,
  longest_streak,
  updated_at
FROM streaks
ORDER BY updated_at DESC;

