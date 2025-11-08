-- =====================================================
-- CLEANUP STUDENT PROFILES RLS POLICIES
-- =====================================================
-- Remove all old/duplicate policies and keep only the correct ones

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Service role can manage all student profiles" ON student_profiles;
DROP POLICY IF EXISTS "Users can delete own student profiles" ON student_profiles;
DROP POLICY IF EXISTS "Students can create own profiles" ON student_profiles;
DROP POLICY IF EXISTS "Users can insert their own student profile" ON student_profiles;
DROP POLICY IF EXISTS "Users can view own student profiles" ON student_profiles;
DROP POLICY IF EXISTS "Users can view their own student profile" ON student_profiles;
DROP POLICY IF EXISTS "Users can update own student profiles" ON student_profiles;
DROP POLICY IF EXISTS "Users can update their own student profile" ON student_profiles;

-- =====================================================
-- CREATE CLEAN POLICIES
-- =====================================================

-- 1. Service role has full access
CREATE POLICY "Service role can manage all student profiles"
ON student_profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Users can SELECT their own profile OR linked profiles (for parents/teachers)
CREATE POLICY "Users can view their own student profile"
ON student_profiles
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR
  id IN (
    SELECT student_profile_id 
    FROM profile_relationships 
    WHERE parent_id = auth.uid()
  )
);

-- 3. Users can INSERT their own profile (auto-created by system)
CREATE POLICY "Users can insert their own student profile"
ON student_profiles
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- 4. Users can UPDATE their own profile (edit name, grade, etc.)
CREATE POLICY "Users can update their own student profile"
ON student_profiles
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- ⚠️ NO DELETE POLICY FOR AUTHENTICATED USERS
-- Student profiles CANNOT be deleted by regular users
-- This preserves parent/teacher access and data integrity
-- Only service_role (admin) can delete

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 
  policyname,
  cmd,
  roles::text,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_status,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as check_status
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'student_profiles'
ORDER BY cmd, policyname;

-- Expected output:
-- 1 policy for ALL (service_role)
-- 1 policy for INSERT (authenticated)
-- 1 policy for SELECT (authenticated)
-- 1 policy for UPDATE (authenticated)
-- 0 policies for DELETE (authenticated) ✅

