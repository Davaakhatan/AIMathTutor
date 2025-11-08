-- =====================================================
-- FIX RLS FOR STUDENT PROFILES - ALLOW INSERTS WITH PROFILE ID
-- =====================================================
-- Issue: Students with student_profile_id cannot insert XP/streak data
-- The current policy only checks user_id, but doesn't account for
-- inserts that include student_profile_id.
--
-- Solution: Allow inserts where user_id matches OR where the 
-- student_profile belongs to the user.

-- =====================================================
-- XP_DATA TABLE
-- =====================================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create their own XP data" ON xp_data;
DROP POLICY IF EXISTS "Users can insert their own XP data" ON xp_data;

-- Create comprehensive INSERT policy
-- Allows insert if:
-- 1. user_id matches auth.uid() (for users without profiles)
-- 2. student_profile_id belongs to a profile owned by auth.uid()
CREATE POLICY "Users can insert their own XP data"
ON xp_data
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR
  student_profile_id IN (
    SELECT id FROM student_profiles 
    WHERE owner_id = auth.uid()
  )
);

-- =====================================================
-- STREAKS TABLE
-- =====================================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create their own streak data" ON streaks;
DROP POLICY IF EXISTS "Users can insert their own streak data" ON streaks;

-- Create comprehensive INSERT policy
CREATE POLICY "Users can insert their own streak data"
ON streaks
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR
  student_profile_id IN (
    SELECT id FROM student_profiles 
    WHERE owner_id = auth.uid()
  )
);

-- =====================================================
-- ALSO FIX SELECT POLICIES
-- =====================================================

-- XP_DATA: Allow reading own data or student profile data
DROP POLICY IF EXISTS "Users can view their own XP data" ON xp_data;
CREATE POLICY "Users can view their own XP data"
ON xp_data
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR
  student_profile_id IN (
    SELECT id FROM student_profiles 
    WHERE owner_id = auth.uid()
  )
);

-- STREAKS: Allow reading own data or student profile data
DROP POLICY IF EXISTS "Users can view their own streak data" ON streaks;
CREATE POLICY "Users can view their own streak data"
ON streaks
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR
  student_profile_id IN (
    SELECT id FROM student_profiles 
    WHERE owner_id = auth.uid()
  )
);

-- =====================================================
-- UPDATE POLICIES TOO
-- =====================================================

-- XP_DATA UPDATE
DROP POLICY IF EXISTS "Users can update their own XP data" ON xp_data;
CREATE POLICY "Users can update their own XP data"
ON xp_data
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR
  student_profile_id IN (
    SELECT id FROM student_profiles 
    WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR
  student_profile_id IN (
    SELECT id FROM student_profiles 
    WHERE owner_id = auth.uid()
  )
);

-- STREAKS UPDATE
DROP POLICY IF EXISTS "Users can update their own streak data" ON streaks;
CREATE POLICY "Users can update their own streak data"
ON streaks
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR
  student_profile_id IN (
    SELECT id FROM student_profiles 
    WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR
  student_profile_id IN (
    SELECT id FROM student_profiles 
    WHERE owner_id = auth.uid()
  )
);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check XP_DATA policies
SELECT 
  'xp_data' as table_name,
  policyname,
  cmd,
  roles::text
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'xp_data'
ORDER BY cmd, policyname;

-- Check STREAKS policies
SELECT 
  'streaks' as table_name,
  policyname,
  cmd,
  roles::text
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'streaks'
ORDER BY cmd, policyname;

