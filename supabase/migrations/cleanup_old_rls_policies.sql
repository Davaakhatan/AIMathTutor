-- Clean up old duplicate RLS policies
-- Remove old {public} role policies that were replaced with {authenticated} policies

-- Drop old xp_data policies (public role)
DROP POLICY IF EXISTS "Users can create own xp_data" ON xp_data;
DROP POLICY IF EXISTS "Users can update own xp_data" ON xp_data;
DROP POLICY IF EXISTS "Users can view own xp_data" ON xp_data;

-- Drop old streaks policies (public role)
DROP POLICY IF EXISTS "Users can create own streaks" ON streaks;
DROP POLICY IF EXISTS "Users can update own streaks" ON streaks;
DROP POLICY IF EXISTS "Users can view own streaks" ON streaks;

-- Verify cleanup - should only show {authenticated} and {service_role} policies
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

