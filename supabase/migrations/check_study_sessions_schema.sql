-- Check study_sessions table schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'study_sessions'
ORDER BY ordinal_position;
