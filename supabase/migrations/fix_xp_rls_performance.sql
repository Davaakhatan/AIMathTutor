-- Fix XP RLS performance issue
-- The subquery in SELECT policy is causing queries to hang
-- Simplify to just check user_id = auth.uid() for now

-- Drop the slow policies
DROP POLICY IF EXISTS "Users can view their own XP data" ON xp_data;
DROP POLICY IF EXISTS "Users can insert their own XP data" ON xp_data;
DROP POLICY IF EXISTS "Users can update their own XP data" ON xp_data;

-- Create simplified, FAST policies
-- For students: Just check user_id = auth.uid()
-- Parents/teachers can be handled separately later

CREATE POLICY "Users can view their own XP data (FAST)"
  ON xp_data FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own XP data (FAST)"
  ON xp_data FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own XP data (FAST)"
  ON xp_data FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Verify new policies
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'xp_data'
  AND roles = '{authenticated}'
ORDER BY cmd;

