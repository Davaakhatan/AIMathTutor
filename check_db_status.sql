-- Check if daily_problems_completion table foreign keys
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  a.attname AS column_name,
  confrelid::regclass AS foreign_table_name,
  af.attname AS foreign_column_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE contype = 'f' 
  AND conrelid::regclass::text = 'daily_problems_completion'
  AND a.attname = 'user_id';

-- Check indexes on daily_problems_completion
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'daily_problems_completion'
ORDER BY indexname;

-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'daily_problems_completion';
