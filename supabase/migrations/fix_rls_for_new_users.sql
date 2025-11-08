-- =====================================================
-- FIX RLS POLICIES TO ALLOW NEW USER INSERTS
-- =====================================================
-- Issue: New users cannot create their initial xp_data and streaks records
-- because RLS policies are blocking authenticated user inserts
--
-- Root cause: The INSERT policies are checking conditions that don't match
-- for brand new users creating their first records

-- =====================================================
-- XP_DATA TABLE
-- =====================================================

-- Drop the old restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create their own XP data" ON xp_data;

-- Create new permissive INSERT policy
-- Allow users to insert if:
-- 1. user_id matches their auth.uid() OR
-- 2. student_profile_id belongs to a student profile they own
CREATE POLICY "Users can create their own XP data"
ON xp_data
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR
  student_profile_id IN (
    SELECT id FROM student_profiles
    WHERE owner_id IN (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- =====================================================
-- STREAKS TABLE
-- =====================================================

-- Drop the old restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create their own streak data" ON streaks;

-- Create new permissive INSERT policy
-- Allow users to insert if:
-- 1. user_id matches their auth.uid() OR
-- 2. student_profile_id belongs to a student profile they own
CREATE POLICY "Users can create their own streak data"
ON streaks
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR
  student_profile_id IN (
    SELECT id FROM student_profiles
    WHERE owner_id IN (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Show all policies for xp_data
SELECT 
  'xp_data' as table_name,
  policyname,
  cmd,
  roles::text,
  qual AS using_clause,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'xp_data'
ORDER BY cmd, policyname;

-- Show all policies for streaks
SELECT 
  'streaks' as table_name,
  policyname,
  cmd,
  roles::text,
  qual AS using_clause,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'streaks'
ORDER BY cmd, policyname;

