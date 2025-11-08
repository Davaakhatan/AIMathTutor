-- =====================================================
-- SIMPLIFIED RLS POLICIES - ALLOW NEW USER INSERTS
-- =====================================================
-- The previous complex policy was blocking new users.
-- This simpler policy just checks if user_id matches auth.uid()

-- =====================================================
-- XP_DATA TABLE
-- =====================================================

-- Drop the complex policy
DROP POLICY IF EXISTS "Users can create their own XP data" ON xp_data;

-- Create simple policy: Just check if user_id matches
CREATE POLICY "Users can create their own XP data"
ON xp_data
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

-- =====================================================
-- STREAKS TABLE
-- =====================================================

-- Drop the complex policy
DROP POLICY IF EXISTS "Users can create their own streak data" ON streaks;

-- Create simple policy: Just check if user_id matches
CREATE POLICY "Users can create their own streak data"
ON streaks
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 
  'xp_data' as table_name,
  policyname,
  cmd,
  roles::text,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'xp_data'
  AND cmd = 'INSERT'
ORDER BY policyname;

SELECT 
  'streaks' as table_name,
  policyname,
  cmd,
  roles::text,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'streaks'
  AND cmd = 'INSERT'
ORDER BY policyname;

