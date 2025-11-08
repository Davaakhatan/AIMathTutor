-- =====================================================
-- CHECK XP_DATA RLS POLICIES
-- =====================================================

-- Run this in your Supabase SQL Editor to see current policies
SELECT 
  'xp_data' as table_name,
  policyname,
  cmd,
  roles::text
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'xp_data'
ORDER BY cmd, policyname;

