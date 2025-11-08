-- Fix RLS Policies for XP Data and Streaks
-- SIMPLIFIED VERSION - Allow authenticated users to manage their own data
-- For profile-based queries, check if the profile exists and matches the user

-- ============================================
-- XP_DATA POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own XP data" ON xp_data;
DROP POLICY IF EXISTS "Users can create their own XP data" ON xp_data;
DROP POLICY IF EXISTS "Users can update their own XP data" ON xp_data;
DROP POLICY IF EXISTS "Service role can manage all XP data" ON xp_data;

-- Simplified policies - just check user_id or student_profile_id
CREATE POLICY "Users can view their own XP data"
  ON xp_data FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    student_profile_id IN (SELECT id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create their own XP data"
  ON xp_data FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR
    student_profile_id IN (SELECT id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update their own XP data"
  ON xp_data FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    student_profile_id IN (SELECT id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Service role can manage all XP data"
  ON xp_data FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- STREAKS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own streak data" ON streaks;
DROP POLICY IF EXISTS "Users can create their own streak data" ON streaks;
DROP POLICY IF EXISTS "Users can update their own streak data" ON streaks;
DROP POLICY IF EXISTS "Service role can manage all streak data" ON streaks;

-- Simplified policies - just check user_id or student_profile_id
CREATE POLICY "Users can view their own streak data"
  ON streaks FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    student_profile_id IN (SELECT id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create their own streak data"
  ON streaks FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR
    student_profile_id IN (SELECT id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update their own streak data"
  ON streaks FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    student_profile_id IN (SELECT id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Service role can manage all streak data"
  ON streaks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('xp_data', 'streaks')
ORDER BY tablename, policyname;

