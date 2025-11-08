-- =====================================================
-- FIX ONLY XP_DATA RLS (STREAKS ARE WORKING)
-- =====================================================

-- Drop ALL existing XP_DATA policies
DROP POLICY IF EXISTS "Service role can manage all XP data" ON xp_data;
DROP POLICY IF EXISTS "Users can create their own XP data" ON xp_data;
DROP POLICY IF EXISTS "Users can insert their own XP data" ON xp_data;
DROP POLICY IF EXISTS "Users can view their own XP data" ON xp_data;
DROP POLICY IF EXISTS "Users can update their own XP data" ON xp_data;
DROP POLICY IF EXISTS "Users can create own xp_data" ON xp_data;
DROP POLICY IF EXISTS "Users can view own xp_data" ON xp_data;
DROP POLICY IF EXISTS "Users can update own xp_data" ON xp_data;

-- =====================================================
-- CREATE FRESH XP_DATA POLICIES (MATCHING STREAKS)
-- =====================================================

-- 1. Service role (admin access)
CREATE POLICY "Service role can manage all XP data"
ON xp_data
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. INSERT policy (same as streaks)
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

-- 3. SELECT policy (same as streaks)
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

-- 4. UPDATE policy (same as streaks)
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

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 
  'xp_data' as table_name,
  policyname,
  cmd,
  roles::text
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'xp_data'
ORDER BY cmd, policyname;

-- Should show 4 policies:
-- 1. Service role can manage all XP data (ALL)
-- 2. Users can insert their own XP data (INSERT)
-- 3. Users can view their own XP data (SELECT)
-- 4. Users can update their own XP data (UPDATE)

