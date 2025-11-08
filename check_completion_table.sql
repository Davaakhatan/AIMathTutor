-- Run this in your Supabase SQL Editor to check the daily_problems_completion table structure

-- 1. Check the foreign key constraints
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name='daily_problems_completion'
  AND kcu.column_name = 'user_id';

-- 2. Check indexes on the table
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'daily_problems_completion'
ORDER BY indexname;

-- 3. Check if there are any records
SELECT COUNT(*) as total_records FROM daily_problems_completion;

-- 4. Test a simple query (replace with your actual user_id)
SELECT id, user_id, problem_date, solved_at
FROM daily_problems_completion
WHERE problem_date = '2025-11-08'
LIMIT 5;

-- 5. Check RLS policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'daily_problems_completion';

