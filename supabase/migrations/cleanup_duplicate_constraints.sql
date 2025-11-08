-- =====================================================
-- CLEANUP DUPLICATE UNIQUE CONSTRAINTS
-- =====================================================
-- We have duplicate constraints on the same columns
-- Keep the named one, drop the auto-generated one

-- =====================================================
-- STREAKS TABLE
-- =====================================================

-- Drop the auto-generated constraint (keep our named one)
ALTER TABLE streaks 
DROP CONSTRAINT IF EXISTS streaks_user_id_student_profile_id_key;

-- Verify we only have one constraint left
-- Expected: streaks_user_profile_unique UNIQUE (user_id, student_profile_id)


-- =====================================================
-- XP_DATA TABLE
-- =====================================================

-- Check and drop auto-generated constraint if it exists
ALTER TABLE xp_data 
DROP CONSTRAINT IF EXISTS xp_data_user_id_student_profile_id_key;

-- Verify we only have one constraint left
-- Expected: xp_data_user_profile_unique UNIQUE (user_id, student_profile_id)


-- =====================================================
-- VERIFICATION
-- =====================================================

-- Show remaining constraints on streaks
SELECT 
  'streaks' as table_name,
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.streaks'::regclass
  AND contype = 'u'
ORDER BY conname;

-- Show remaining constraints on xp_data
SELECT 
  'xp_data' as table_name,
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.xp_data'::regclass
  AND contype = 'u'
ORDER BY conname;

