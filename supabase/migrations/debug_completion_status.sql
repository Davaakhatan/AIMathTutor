-- Debug: Check if Problem of the Day completion exists in database
-- Run this in Supabase SQL Editor

-- 1. Check if there are any completions for today
SELECT 
  id, 
  user_id, 
  problem_date, 
  problem_text,
  solved_at
FROM daily_problems_completion
WHERE problem_date = '2025-11-08'
ORDER BY solved_at DESC;

-- 2. Check if the problem text matches what's shown in the UI
SELECT 
  problem_date,
  problem_text,
  difficulty,
  topic
FROM daily_problems
WHERE problem_date = '2025-11-08';

-- 3. Check RLS policies are working (should see service_role policies)
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  roles
FROM pg_policies
WHERE tablename = 'daily_problems_completion'
ORDER BY policyname;

