-- CLEAR ALL current_student_profile_id FOR STUDENTS
-- Students should NEVER have this set (they use user-level data)

-- Show students that have current_student_profile_id set (before fix)
SELECT 
  'Before Fix' as status,
  id as user_id,
  role,
  current_student_profile_id,
  created_at
FROM profiles
WHERE role = 'student' 
  AND current_student_profile_id IS NOT NULL;

-- Clear current_student_profile_id for all students
UPDATE profiles
SET current_student_profile_id = NULL
WHERE role = 'student' 
  AND current_student_profile_id IS NOT NULL;

-- Show result (should be all NULL for students)
SELECT 
  'After Fix' as status,
  id as user_id,
  role,
  current_student_profile_id,
  created_at
FROM profiles
WHERE role = 'student'
ORDER BY created_at DESC;

-- Verification query (should return 0)
SELECT COUNT(*) as students_with_profile_id
FROM profiles
WHERE role = 'student' 
  AND current_student_profile_id IS NOT NULL;

