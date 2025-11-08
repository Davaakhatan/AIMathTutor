-- Check actual database schema vs expected
-- Run this in Supabase SQL Editor

-- 1. Check xp_data columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'xp_data'
ORDER BY ordinal_position;

-- 2. Check study_sessions columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'study_sessions'
ORDER BY ordinal_position;

-- 3. Check streaks table constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'streaks';

-- 4. Check unique indexes on streaks
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'streaks' AND indexdef LIKE '%UNIQUE%';

