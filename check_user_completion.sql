-- Run this in Supabase SQL Editor to check completion status
-- Replace with your actual user_id if different

SELECT 
  id,
  user_id,
  student_profile_id,
  problem_date,
  problem_text,
  solved_at,
  created_at
FROM daily_problems_completion
WHERE user_id = 'f372c3dc-9a8a-44a8-a9bf-c2104135309b'
ORDER BY problem_date DESC, created_at DESC
LIMIT 10;

-- Also check today's problem
SELECT 
  id,
  problem_date,
  problem_text,
  problem_type,
  difficulty
FROM daily_problems
WHERE problem_date = '2025-11-08';
