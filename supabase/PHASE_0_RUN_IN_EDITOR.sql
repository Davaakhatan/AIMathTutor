-- ============================================================================
-- PHASE 0: Database Foundation - Run in Supabase SQL Editor
-- ============================================================================
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Copy and paste this ENTIRE file
-- 3. Click "Run" 
-- 4. Check the output for success messages
-- ============================================================================

-- STEP 1: Clean XP Duplicates
-- ============================================================================
WITH ranked_xp AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, COALESCE(student_profile_id::text, 'null')
      ORDER BY updated_at DESC NULLS LAST,
               created_at DESC NULLS LAST,
               id DESC
    ) AS rn
  FROM xp_data
)
DELETE FROM xp_data
WHERE id IN (
  SELECT id FROM ranked_xp WHERE rn > 1
);

-- STEP 2: Clean Streak Duplicates
-- ============================================================================
WITH ranked_streaks AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, COALESCE(student_profile_id::text, 'null')
      ORDER BY updated_at DESC NULLS LAST,
               created_at DESC NULLS LAST,
               id DESC
    ) AS rn
  FROM streaks
)
DELETE FROM streaks
WHERE id IN (
  SELECT id FROM ranked_streaks WHERE rn > 1
);

-- STEP 3: Create Unique Indexes
-- ============================================================================
-- Drop existing if any
DROP INDEX IF EXISTS idx_xp_data_user_unique;
DROP INDEX IF EXISTS idx_xp_data_profile_unique;
DROP INDEX IF EXISTS idx_streaks_user_unique;
DROP INDEX IF EXISTS idx_streaks_profile_unique;

-- XP: Personal (no profile)
CREATE UNIQUE INDEX idx_xp_data_user_unique
  ON xp_data(user_id)
  WHERE student_profile_id IS NULL;

-- XP: Profile-specific
CREATE UNIQUE INDEX idx_xp_data_profile_unique
  ON xp_data(student_profile_id)
  WHERE student_profile_id IS NOT NULL;

-- Streaks: Personal (no profile)
CREATE UNIQUE INDEX idx_streaks_user_unique
  ON streaks(user_id)
  WHERE student_profile_id IS NULL;

-- Streaks: Profile-specific
CREATE UNIQUE INDEX idx_streaks_profile_unique
  ON streaks(student_profile_id)
  WHERE student_profile_id IS NOT NULL;

-- STEP 4: Fix RLS Policies for XP
-- ============================================================================
-- Drop old policies
DROP POLICY IF EXISTS "Users can view own XP data" ON xp_data;
DROP POLICY IF EXISTS "Users can insert own XP data" ON xp_data;
DROP POLICY IF EXISTS "Users can update own XP data" ON xp_data;
DROP POLICY IF EXISTS "Users can delete own XP data" ON xp_data;
DROP POLICY IF EXISTS "xp_data_select_policy" ON xp_data;
DROP POLICY IF EXISTS "xp_data_insert_policy" ON xp_data;
DROP POLICY IF EXISTS "xp_data_update_policy" ON xp_data;
DROP POLICY IF EXISTS "xp_data_delete_policy" ON xp_data;
DROP POLICY IF EXISTS "xp_select_own" ON xp_data;
DROP POLICY IF EXISTS "xp_insert_own" ON xp_data;
DROP POLICY IF EXISTS "xp_update_own" ON xp_data;
DROP POLICY IF EXISTS "xp_delete_own" ON xp_data;

-- Enable RLS
ALTER TABLE xp_data ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "xp_select_own"
  ON xp_data FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "xp_insert_own"
  ON xp_data FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "xp_update_own"
  ON xp_data FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "xp_delete_own"
  ON xp_data FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- STEP 5: Fix RLS Policies for Streaks
-- ============================================================================
-- Drop old policies
DROP POLICY IF EXISTS "Users can view own streaks" ON streaks;
DROP POLICY IF EXISTS "Users can insert own streaks" ON streaks;
DROP POLICY IF EXISTS "Users can update own streaks" ON streaks;
DROP POLICY IF EXISTS "Users can delete own streaks" ON streaks;
DROP POLICY IF EXISTS "streaks_select_policy" ON streaks;
DROP POLICY IF EXISTS "streaks_insert_policy" ON streaks;
DROP POLICY IF EXISTS "streaks_update_policy" ON streaks;
DROP POLICY IF EXISTS "streaks_delete_policy" ON streaks;
DROP POLICY IF EXISTS "streaks_select_own" ON streaks;
DROP POLICY IF EXISTS "streaks_insert_own" ON streaks;
DROP POLICY IF EXISTS "streaks_update_own" ON streaks;
DROP POLICY IF EXISTS "streaks_delete_own" ON streaks;

-- Enable RLS
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "streaks_select_own"
  ON streaks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "streaks_insert_own"
  ON streaks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "streaks_update_own"
  ON streaks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "streaks_delete_own"
  ON streaks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- STEP 6: Fix RLS Policies for Student Profiles
-- ============================================================================
-- Drop old policies
DROP POLICY IF EXISTS "Users can view own profiles" ON student_profiles;
DROP POLICY IF EXISTS "Users can insert own profiles" ON student_profiles;
DROP POLICY IF EXISTS "Users can update own profiles" ON student_profiles;
DROP POLICY IF EXISTS "Users can delete own profiles" ON student_profiles;
DROP POLICY IF EXISTS "student_profiles_select_policy" ON student_profiles;
DROP POLICY IF EXISTS "student_profiles_insert_policy" ON student_profiles;
DROP POLICY IF EXISTS "student_profiles_update_policy" ON student_profiles;
DROP POLICY IF EXISTS "student_profiles_delete_policy" ON student_profiles;
DROP POLICY IF EXISTS "Students can view own profile" ON student_profiles;
DROP POLICY IF EXISTS "Students can update own profile" ON student_profiles;
DROP POLICY IF EXISTS "Parents can view linked profiles" ON student_profiles;
DROP POLICY IF EXISTS "Teachers can view linked profiles" ON student_profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON student_profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON student_profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON student_profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON student_profiles;

-- Enable RLS
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

-- Create new policies (simple version for now)
CREATE POLICY "profiles_select_own"
  ON student_profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM profile_relationships pr
      WHERE pr.student_profile_id = student_profiles.id
      AND pr.parent_id = auth.uid()
    )
  );

CREATE POLICY "profiles_insert_own"
  ON student_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "profiles_update_own"
  ON student_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "profiles_delete_own"
  ON student_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- STEP 7: Verify Everything
-- ============================================================================
-- Check for remaining duplicates
SELECT 
  'XP Duplicates' as check_type,
  COUNT(*) as count
FROM (
  SELECT user_id, student_profile_id, COUNT(*) as cnt
  FROM xp_data
  GROUP BY user_id, student_profile_id
  HAVING COUNT(*) > 1
) duplicates

UNION ALL

SELECT 
  'Streak Duplicates' as check_type,
  COUNT(*) as count
FROM (
  SELECT user_id, student_profile_id, COUNT(*) as cnt
  FROM streaks
  GROUP BY user_id, student_profile_id
  HAVING COUNT(*) > 1
) duplicates

UNION ALL

SELECT 'Total XP Records' as check_type, COUNT(*) as count FROM xp_data
UNION ALL
SELECT 'Total Streak Records' as check_type, COUNT(*) as count FROM streaks
UNION ALL
SELECT 'Total Student Profiles' as check_type, COUNT(*) as count FROM student_profiles;

-- ============================================================================
-- EXPECTED OUTPUT:
-- ============================================================================
-- check_type              | count
-- ------------------------+-------
-- XP Duplicates           | 0      ✅ Should be 0
-- Streak Duplicates       | 0      ✅ Should be 0
-- Total XP Records        | varies (number of XP records)
-- Total Streak Records    | varies (number of streak records)
-- Total Student Profiles  | varies (number of profiles)
-- ============================================================================

-- ✅ PHASE 0 COMPLETE!
-- Next: Test by creating a new user and checking XP creation works

