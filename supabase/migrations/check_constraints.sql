-- Check if unique constraints exist and are working
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'xp_data'::regclass
  AND contype = 'u';  -- u = unique constraint

-- Check for duplicate XP records that violate the constraint
SELECT 
  user_id, 
  student_profile_id,
  COUNT(*) as count
FROM xp_data
GROUP BY user_id, student_profile_id
HAVING COUNT(*) > 1;

