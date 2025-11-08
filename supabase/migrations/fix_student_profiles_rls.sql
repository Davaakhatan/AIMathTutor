-- =====================================================
-- STUDENT PROFILES RLS POLICIES
-- =====================================================
-- Allow students to view and edit their own profile
-- But PREVENT deletion (profile must persist for parent/teacher access)

-- Enable RLS
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own student profile" ON student_profiles;
DROP POLICY IF EXISTS "Users can insert their own student profile" ON student_profiles;
DROP POLICY IF EXISTS "Users can update their own student profile" ON student_profiles;
DROP POLICY IF EXISTS "Service role can manage all student profiles" ON student_profiles;

-- Service role has full access
CREATE POLICY "Service role can manage all student profiles"
ON student_profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Students can view their own profile
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

-- Students can create their own profile
CREATE POLICY "Users can insert their own student profile"
ON student_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = auth.uid()
);

-- Students can update their own profile (name, grade_level, etc.)
CREATE POLICY "Users can update their own student profile"
ON student_profiles
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- ⚠️ NO DELETE POLICY
-- Student profiles CANNOT be deleted by users
-- This ensures parent/teacher access is preserved
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

