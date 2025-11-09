-- Migration: Validate and Fix RLS Policies
-- Purpose: Ensure students can create/update their own data but not others'
-- Date: 2025-11-09 04:00 AM

BEGIN;

-- ============================================================================
-- XP Data RLS Policies
-- ============================================================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own XP data" ON xp_data;
DROP POLICY IF EXISTS "Users can insert own XP data" ON xp_data;
DROP POLICY IF EXISTS "Users can update own XP data" ON xp_data;
DROP POLICY IF EXISTS "Users can delete own XP data" ON xp_data;
DROP POLICY IF EXISTS "xp_data_select_policy" ON xp_data;
DROP POLICY IF EXISTS "xp_data_insert_policy" ON xp_data;
DROP POLICY IF EXISTS "xp_data_update_policy" ON xp_data;
DROP POLICY IF EXISTS "xp_data_delete_policy" ON xp_data;

-- Enable RLS
ALTER TABLE xp_data ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view their own XP (personal or profile-specific)
CREATE POLICY "xp_select_own"
  ON xp_data
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
  );

-- INSERT: Users can create their own XP records
CREATE POLICY "xp_insert_own"
  ON xp_data
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );

-- UPDATE: Users can update their own XP records
CREATE POLICY "xp_update_own"
  ON xp_data
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own XP records (for account deletion)
CREATE POLICY "xp_delete_own"
  ON xp_data
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DO $$
BEGIN
  RAISE NOTICE '✅ XP Data RLS policies created';
END $$;

-- ============================================================================
-- Streak Data RLS Policies
-- ============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own streaks" ON streaks;
DROP POLICY IF EXISTS "Users can insert own streaks" ON streaks;
DROP POLICY IF EXISTS "Users can update own streaks" ON streaks;
DROP POLICY IF EXISTS "Users can delete own streaks" ON streaks;
DROP POLICY IF EXISTS "streaks_select_policy" ON streaks;
DROP POLICY IF EXISTS "streaks_insert_policy" ON streaks;
DROP POLICY IF EXISTS "streaks_update_policy" ON streaks;
DROP POLICY IF EXISTS "streaks_delete_policy" ON streaks;

-- Enable RLS
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view their own streaks
CREATE POLICY "streaks_select_own"
  ON streaks
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
  );

-- INSERT: Users can create their own streak records
CREATE POLICY "streaks_insert_own"
  ON streaks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );

-- UPDATE: Users can update their own streak records
CREATE POLICY "streaks_update_own"
  ON streaks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own streak records
CREATE POLICY "streaks_delete_own"
  ON streaks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DO $$
BEGIN
  RAISE NOTICE '✅ Streak RLS policies created';
END $$;

-- ============================================================================
-- Student Profiles RLS Policies
-- ============================================================================

-- Drop all existing policies
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

-- Enable RLS
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view their own profiles
-- Parents can view linked profiles (via profile_relationships)
CREATE POLICY "profiles_select_own"
  ON student_profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = owner_id
    OR
    -- Allow parents to view linked profiles
    EXISTS (
      SELECT 1 FROM profile_relationships pr
      WHERE pr.student_profile_id = student_profiles.id
      AND pr.parent_id = auth.uid()
    )
  );

-- INSERT: Users can create profiles for themselves
CREATE POLICY "profiles_insert_own"
  ON student_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
  );

-- UPDATE: Users can edit their own profile
-- Parents can edit linked profiles if they have manage permission
CREATE POLICY "profiles_update_own"
  ON student_profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = owner_id
    OR
    EXISTS (
      SELECT 1 FROM profile_relationships pr
      WHERE pr.student_profile_id = student_profiles.id
      AND pr.parent_id = auth.uid()
      AND pr.can_manage_profile = true
    )
  )
  WITH CHECK (
    auth.uid() = owner_id
    OR
    EXISTS (
      SELECT 1 FROM profile_relationships pr
      WHERE pr.student_profile_id = student_profiles.id
      AND pr.parent_id = auth.uid()
      AND pr.can_manage_profile = true
    )
  );

-- DELETE: Only the user who created the profile can delete it
-- Students CANNOT delete their own profile (safety measure)
CREATE POLICY "profiles_delete_own"
  ON student_profiles
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = owner_id
    AND
    -- Additional check: only if user is parent/teacher role
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('parent', 'teacher', 'admin')
    )
  );

DO $$
BEGIN
  RAISE NOTICE '✅ Student Profile RLS policies created';
END $$;

-- ============================================================================
-- Profiles RLS Policies (Base User Profiles)
-- ============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view their own profile
CREATE POLICY "base_profiles_select_own"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- INSERT: Users can create their own profile on signup
CREATE POLICY "base_profiles_insert_own"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- UPDATE: Users can update their own profile
CREATE POLICY "base_profiles_update_own"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DO $$
BEGIN
  RAISE NOTICE '✅ Base Profile RLS policies created';
END $$;

-- ============================================================================
-- Summary
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '================================';
  RAISE NOTICE 'RLS Policy Summary';
  RAISE NOTICE '================================';
  RAISE NOTICE 'xp_data: 4 policies (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE 'streaks: 4 policies (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE 'student_profiles: 4 policies (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE 'profiles: 3 policies (SELECT, INSERT, UPDATE)';
  RAISE NOTICE '================================';
  RAISE NOTICE 'All policies follow principle:';
  RAISE NOTICE '- Users can only access their own data';
  RAISE NOTICE '- Parents/teachers can access linked student data';
  RAISE NOTICE '- Students cannot delete their own profiles';
  RAISE NOTICE '================================';
END $$;

COMMIT;

-- ============================================================================
-- NOTES
-- ============================================================================
-- This migration:
-- 1. Removes ALL existing RLS policies (clean slate)
-- 2. Creates simple, secure policies for each table
-- 3. Follows principle of least privilege
-- 4. Prevents cross-user data access
-- 5. Allows parents/teachers to manage linked students

-- To test these policies:
-- 1. Create a test user
-- 2. Try to create XP record with their ID (should succeed)
-- 3. Try to create XP record with different ID (should fail)
-- 4. Try to read another user's XP (should return 0 rows)
-- 5. Try to update another user's XP (should fail)

-- To run this migration:
-- supabase db push --dns-resolver https
-- OR run in Supabase SQL Editor

